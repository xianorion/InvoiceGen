# 📑 Automated PDF Invoice Engine

A modern React and Next.js utility application designed to automate the process of generating sequential invoices, compiling multi-line product tables, calculating taxes, and saving final documents silently to a specific folder on your local hard drive. 

---

## 🚀 Quick Start & Technical Requirements

### 1. Project Dependencies
This project uses `Tailwind CSS` for user interface layouts, `pdf-lib` for form field injection, and `@pdf-lib/fontkit` to handle custom typography embeddings.

Run the following command inside your project terminal to verify all packages are installed:
```bash
npm install pdf-lib @pdf-lib/fontkit
```

### 2. Assets Directory Checklist
Before launching the application, ensure that you place these files directly inside your Next.js project's **`public/`** folder:
*   📁 `your-project/public/template.pdf` — *The fillable PDF form you create.*
*   📁 `your-project/public/Calibri.ttf` — *The Calibri font file (Required for typography mapping).*

To start your local development environment, run:
```bash
npm run dev
```
Open **`http://localhost:3000`** in a modern browser (Google Chrome, Microsoft Edge, or Opera) to use the app.

---

## 🛠️ How to Build Your PDF Template (`template.pdf`)

The application does not read raw static text from a page; instead, it looks for the **internal programmatic Field Names** of interactive text box layers. You must design your PDF with true form inputs.

### Setting Up Fields via Adobe Acrobat Pro
1. Open your baseline graphic invoice layout in **Adobe Acrobat Pro**.
2. From the right-hand panel, select **All Tools** > **Prepare a form**.
3. Clear out any random auto-generated boxes Acrobat guessed poorly. 
4. Select the **Text Field Tool** from the toolbar and manually draw form boxes over your document.
5. Set the properties of each text box to match the following rules:

### Metadata & Single-Line Fields
Double-click each field box, go to the **General** tab, and name them exactly as shown below *(do not use spaces or curly braces)*:
*   `invoice_number` — *Where the sequential ID goes.*
*   `date_of_service` — *The date calendar input.*
*   `due_date` — *The due date calendar input.*
*   `subtotal` — *Gross total calculation output.*
*   `tax` — *Calculated 6.0% Michigan sales tax.*
*   `total` — *Net payable grand total value.*

### Product Line Columns (Critical Settings)
For your transaction item grid, you must create **four separate vertical columns** tracking descriptions, quantities, unit prices, and final lines totals. To prevent your list from crashing into a single line:
1. Draw four separate tall text box fields side-by-side. Name them:
   *   `descriptions`
   *   `quantities`
   *   `prices`
   *   `amounts`
2. Double-click **each** of these four boxes, go to the **Options** tab, and **CHECK** the box for **`Multi-line`**.
3. **UNCHECK** the box for **`Scroll long text`** *(Leaving scroll checked will force your text into one infinite unreadable horizontal line).*
4. Go to the **Appearance** tab and change the **Font Size** from "Auto" to an explicit size number (e.g., 11 or 12). 

*Note: The code forces an override text formatting size of **35pt** for all elements to fit specific larger field configurations. Adjust line sizing widths in Acrobat to support heavy text wrap scaling constraints.*

---

## 💻 Standard Operational Workflow

To ensure that the app successfully increments numbers and doesn't reset to `1001`, follow these exact steps when opening the webpage:

1.  **Mount the Local Directory:** Click the yellow **Select Local Save Folder** button at the top. Grant the browser permission to modify the directory when prompted. This folder will be where your final PDFs and logs are saved.
2.  **Upload the Ledger File:** Click the file input button and upload your existing tracker text file (e.g., `invoice_history.txt`). 
    *   *Note:* This text file **must** live inside the exact same local folder you selected in step 1.
    *   *If the file is blank:* The engine automatically initializes your active sequence tracking floor at `1001`.
3.  **Define the Prefix:** Type in your active business prefix (e.g., `DP`). The log scanner will instantly extract your highest previous number and stage the new invoice sequence.
4.  **Populate Items:** Use the interactive grid form to add products. State tax calculations dynamically update via live client metrics.
5.  **Compile & Finalize:** Click **Write Invoice directly to Folder**. The application will:
    *   Inject data seamlessly using the custom **Calibri** font.
    *   Wipe clean and refresh the tracker text file inside your folder with the latest sequence code written on a brand-new line.
    *   Flatten the form fields inside the output PDF so it is permanent and cannot be altered by a recipient.
    *   Clear the screen data table automatically so you are immediately ready to type a new invoice for the next client.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
