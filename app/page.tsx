'use client';

import { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export default function RetroInvoiceApp() {
  // Configuration States
  const [prefix, setPrefix] = useState('GDG'); // Swapped default prefix to match yours
  const [nextInvoice, setNextInvoice] = useState('');
  const [historyContent, setHistoryContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('invoice_history.txt');

  // User input Form fields
  const [dateOfService, setDateOfService] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [calculateTax, setCalculateTax] = useState(true);

  // Dynamic Product list
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', qty: '', price: '' });
  
  // Local Directory Handle for Saving Files
  const [dirHandle, setDirHandle] = useState(null);

  // Automatically parse whenever prefix or text contents update
  useEffect(() => {
    parseHistoryLog(historyContent);
  }, [prefix, historyContent]);

  // 1. Mount the local folder directory
  const handleSelectSaveFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      alert(`Target directory set to: ${handle.name}`);
    } catch (err) {
      alert('Directory access denied or cancelled.');
    }
  };

  // 2. Read the uploaded History File (.txt)
  const handleHistoryUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result || '';
      setHistoryContent(text);
    };
    reader.readAsText(file);
  };

  // Parsing logic scans text with a strict dash rule
  const parseHistoryLog = (text) => {
    const cleanPrefix = prefix.trim();
    if (!cleanPrefix) {
      setNextInvoice('');
      return;
    }
    
    if (!text || text.trim() === '') {
      setNextInvoice(`${cleanPrefix}-1001`);
      return;
    }
    
    // Scans text explicitly matching your exact layout: PREFIX-NUMBER
    const regex = new RegExp(`${cleanPrefix}-(\\d+)`, 'g');
    let matches;
    let highestNum = 1000;

    while ((matches = regex.exec(text)) !== null) {
      const num = parseInt(matches[1], 10);
      if (num > highestNum) {
        highestNum = num;
      }
    }

    // Forces calculation to cleanly hit the next target (1001 -> 1002)
    setNextInvoice(`${cleanPrefix}-${highestNum + 1}`);
  };

  // 3. Dynamic Product Entry Management
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!form.name || !form.qty || !form.price) return;

    const qty = parseInt(form.qty, 10);
    const price = parseFloat(form.price);
    const total = qty * price;

    setItems([...items, { name: form.name, qty, price, total }]);
    setForm({ name: '', qty: '', price: '' });
  };

  const handleRemoveItem = (indexToRemove) => {
    setItems(items.filter((_, index) => index !== indexToRemove));
  };

  // Compute Invoice Financial Metrics
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const MI_TAX_RATE = 0.06; 
  const tax = calculateTax ? subtotal * MI_TAX_RATE : 0;
  const grandTotal = subtotal + tax;

  // 4. Fill Template and Overwrite Directly to Folder
  const generatePdfInvoice = async () => {
    if (!nextInvoice) {
      alert('Please enter a prefix and ensure your environment is initialized.');
      return;
    }
    if (!dirHandle) {
      alert('Please select a Save Folder location first.');
      return;
    }

    try {
      const response = await fetch(`/template.pdf?t=${Date.now()}`);
      if (!response.ok) throw new Error('Template file "public/template.pdf" not found.');
      const pdfBytes = await response.arrayBuffer();
      
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);
      
      const fontResponse = await fetch(`/Calibri.ttf?t=${Date.now()}`);
      if (!fontResponse.ok) throw new Error('Font file "public/Calibri.ttf" missing.');
      const fontBytes = await fontResponse.arrayBuffer();
      await pdfDoc.embedFont(fontBytes);

      const formFields = pdfDoc.getForm();

      const descBlock = items.map(i => i.name).join('\n');
      const qtyBlock = items.map(i => i.qty).join('\n');
      const priceBlock = items.map(i => `$${i.price.toFixed(2)}`).join('\n');
      const amountBlock = items.map(i => `$${i.total.toFixed(2)}`).join('\n');

      const setField = (fieldName, value, isMultiLine = false) => {
        try {
          const field = formFields.getTextField(fieldName);
          if (isMultiLine) field.enableMultiline();
          
          field.setText(value);
          field.updateRawAppearanceValue(value); 
          
          const acroForm = pdfDoc.getForm().acroForm;
          acroForm.set('Fields', acroForm.Fields());
          
          field.setFontSize(35); 
        } catch (e) {
          console.warn(`Field warning: "${fieldName}" missing.`);
        }
      };

      setField('invoice_number', nextInvoice);
      setField('date_of_service', dateOfService);
      setField('due_date', dueDate);
      setField('descriptions', descBlock, true);
      setField('quantities', qtyBlock, true);
      setField('prices', priceBlock, true);
      setField('amounts', amountBlock, true);
      setField('subtotal', `$${subtotal.toFixed(2)}`);
      setField('tax', `$${tax.toFixed(2)}`);
      setField('total', `$${grandTotal.toFixed(2)}`);

      formFields.flatten();
      const finalPdfBytes = await pdfDoc.save();

      // FIXED FILE NAME: Forces the file to build using the accurate dash format (Invoice_GDG-1002.pdf)
      const pdfFileName = `Invoice_${nextInvoice}.pdf`;
      const pdfFileHandle = await dirHandle.getFileHandle(pdfFileName, { create: true });
      const pdfWritable = await pdfFileHandle.createWritable();
      await pdfWritable.write(finalPdfBytes);
      await pdfWritable.close();

      // PREPARE FRESH RAW PAYLOAD
      let currentLog = historyContent.trim();
      const updatedHistoryString = currentLog ? `${currentLog}\n${nextInvoice}` : nextInvoice;
      
      // FIXED WRITING PIPELINE: Completely truncate and wipe clean to store the dash value safely
      const txtFileHandle = await dirHandle.getFileHandle(uploadedFileName, { create: true });
      const txtWritable = await txtFileHandle.createWritable();
      await txtWritable.truncate(0); 
      await txtWritable.write(updatedHistoryString); 
      await txtWritable.close();

      // Force internal React memory to update so the next sequence rolls smoothly
      setHistoryContent(updatedHistoryString);

      alert(`🎉 Success! Saved "${pdfFileName}" and updated your log file to record the dash assignment sequence.`);
      setItems([]);

    } catch (err) {
      alert(`Compilation Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#8ecae6] p-4 md:p-8 font-mono tracking-tight text-gray-900 selection:bg-yellow-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Main Header Bar */}
        <div className="bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="bg-[#219ebc] border-b-4 border-black px-4 py-3 flex items-center justify-between">
            <div className="flex space-x-2">
              <div className="w-4 h-4 rounded-full bg-[#ffb703] border-2 border-black" />
              <div className="w-4 h-4 rounded-full bg-[#fb8500] border-2 border-black" />
              <div className="w-4 h-4 rounded-full bg-white border-2 border-black" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase">My Invoice App</h1>
            <div className="text-white font-bold hidden sm:block">⚡ V1.2</div>
          </div>
        </div>

        {/* Directory Tracker Config */}
        <div className="bg-[#ffb703] border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="bg-white border-b-4 border-black px-4 py-1.5 flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-black" />
            <span className="text-xs font-bold uppercase tracking-wider">Storage Path Config</span>
          </div>
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">Target Directory Location:</h3>
              <p className="text-xs bg-white/60 px-2 py-0.5 border border-black rounded mt-1 inline-block">
                {dirHandle ? `📁 ${dirHandle.name}/` : '❌ No local folder linked.'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={handleSelectSaveFolder}
              className="bg-white hover:bg-yellow-100 text-black font-black border-2 border-black rounded-lg px-4 py-2 text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              {dirHandle ? 'Change Target Folder' : 'Select Save Folder'}
            </button>
          </div>
        </div>

        {/* Configuration Setup Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Prefix Identification parameters */}
          <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-[#fb8500] text-white border-b-4 border-black px-4 py-2 flex items-center space-x-2 font-bold uppercase text-xs">
              <span>🛠️ Parameters</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Prefix Identification</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-black rounded-lg p-2 font-black text-center text-lg uppercase bg-yellow-50 focus:bg-white outline-none" 
                  value={prefix} 
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())} 
                  placeholder="e.g. GDG" 
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Upload Tracker History (.txt)</label>
                <input 
                  type="file" 
                  accept=".txt" 
                  className="w-full text-xs border-2 border-black rounded-lg bg-gray-50 file:bg-black file:text-white file:border-none file:px-3 file:py-2 file:font-bold cursor-pointer" 
                  onChange={handleHistoryUpload} 
                />
              </div>
            </div>
          </div>

          {/* Date Parameters Selection */}
          <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-[#219ebc] text-white border-b-4 border-black px-4 py-2 flex items-center space-x-2 font-bold uppercase text-xs">
              <span>📅 Billing Period Variables</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Date of Service</label>
                <input type="date" className="w-full border-2 border-black rounded-lg p-2 bg-yellow-50 focus:bg-white outline-none text-xs font-bold" value={dateOfService} onChange={(e) => setDateOfService(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Due Date Target</label>
                <input type="date" className="w-full border-2 border-black rounded-lg p-2 bg-yellow-50 focus:bg-white outline-none text-xs font-bold" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

        </div>

        {/* Product Items Entry Grid and Table Ledger */}
        <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="bg-black text-white px-4 py-2 flex items-center justify-between font-bold uppercase text-xs">
            <span>🛒 Live Product Manifest Ledger</span>
            {nextInvoice && (
              <span className="bg-[#ffb703] text-black px-2 py-0.5 border border-white rounded font-black">
                Staged Assignment: {nextInvoice}
              </span>
            )}
          </div>
          
          <div className="p-4 space-y-4">
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs font-black uppercase block mb-1">Description</label>
                <input type="text" placeholder="Product name/service description" className="w-full border-2 border-black rounded-lg p-2 bg-yellow-50 focus:bg-white outline-none text-xs font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black uppercase block mb-1">Qty</label>
                <input type="number" placeholder="0" className="w-full border-2 border-black rounded-lg p-2 bg-yellow-50 focus:bg-white outline-none text-xs font-bold" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black uppercase block mb-1">Price ($)</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full border-2 border-black rounded-lg p-2 bg-yellow-50 focus:bg-white outline-none text-xs font-bold" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-[#fb8500] hover:bg-[#e07500] text-white border-2 border-black font-black p-2 rounded-lg text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
                Add Line Item
              </button>
            </form>

            {/* Editable Output Table Matrix */}
            <div className="border-2 border-black rounded-lg overflow-hidden mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black font-black uppercase text-gray-700">
                    <th className="p-3">Item Description</th>
                    <th className="p-3 border-l-2 border-black text-center">Qty</th>
                    <th className="p-3 border-l-2 border-black text-right">Price</th>
                    <th className="p-3 border-l-2 border-black text-right">Total</th>
                    <th className="p-3 border-l-2 border-black text-center bg-rose-50 text-rose-700 w-16">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {items.map((item, i) => (
                    <tr key={i} className="hover:bg-yellow-50 font-bold bg-white">
                      <td className="p-3 text-gray-900">{item.name}</td>
                      <td className="p-3 border-l border-black text-center text-gray-600">{item.qty}</td>
                      <td className="p-3 border-l border-black text-right text-gray-600">${item.price.toFixed(2)}</td>
                      <td className="p-3 border-l border-black text-right font-black text-black">${item.total.toFixed(2)}</td>
                      <td className="p-2 border-l border-black text-center bg-rose-50">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(i)}
                          className="bg-rose-500 hover:bg-rose-600 text-white font-black px-2 py-1 text-[10px] rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr className="bg-white">
                      <td colSpan={5} className="p-6 text-center text-gray-400 font-bold italic">
                        No product items have been registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Totals Summary Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Action Call Trigger */}
          <div className="md:col-span-2">
            <button 
              onClick={generatePdfInvoice}
              disabled={!prefix.trim() || items.length === 0 || !dirHandle}
              className="w-full bg-[#219ebc] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#1a7f9a] text-white text-md font-black p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-wider text-center"
            >
              {!dirHandle 
                ? 'Select Save Folder to Unlock Generation' 
                : !prefix.trim() 
                  ? 'Provide an Active Prefix' 
                  : `📁 Save ${nextInvoice} directly to Folder`
              }
            </button>
          </div>

          {/* Subtotals Panel Card */}
          <div className="bg-white p-4 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-end space-y-1.5 font-bold text-xs">
            <div className="flex items-center space-x-2 border-b-2 border-black w-full pb-2 mb-1 justify-end">
              <input type="checkbox" id="taxBox" checked={calculateTax} onChange={(e) => setCalculateTax(e.target.checked)} className="h-4 w-4 accent-black border-2 border-black rounded cursor-pointer" />
              <label htmlFor="taxBox" className="font-black text-gray-700 uppercase tracking-tight cursor-pointer">Michigan Tax (6%)</label>
            </div>
            <div className="text-gray-600">Subtotal: <span className="font-black text-black">${subtotal.toFixed(2)}</span></div>
            <div className="text-gray-600">MI Sales Tax: <span className="font-black text-black">${tax.toFixed(2)}</span></div>
            <div className="text-sm pt-1 font-black text-[#fb8500] border-t border-dashed border-gray-300 w-full text-right">
              Grand Total: <span className="text-base text-black font-black ml-1">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
