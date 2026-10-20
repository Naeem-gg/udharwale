# Udharwale - Viva Questions & Answers

This document contains a comprehensive list of potential viva questions and their respective answers for the **Udharwale: A Personal Ledger and Debt Tracking Web App** capstone project.

## 1. Project Overview & Motivation

**Q1: What is the main objective of the "Udharwale" project?**
**Answer:** The primary objective is to digitize personal debt management and informal lending. It replaces traditional paper-based ledgers ("Khata") used by individuals and small businesses to track everyday micro-transactions (borrowing/lending money, splitting bills, or taking goods on credit).

**Q2: How is Udharwale different from existing apps like Splitwise or KhataBook?**
**Answer:** Splitwise is heavily focused on complex group expense splitting, and KhataBook is tailored for merchants with features like invoicing and GST. Udharwale fills the gap by providing a minimalist, simple "give and take" interface for everyday individuals without the clutter of business accounting or group dynamics.

**Q3: What problem does your application solve?**
**Answer:** It solves the problem of manual tracking of informal debts which often leads to errors, forgotten amounts, and strained relationships. It brings transparency and accountability to everyday micro-finance.

## 2. Technology Stack & Architecture

**Q4: What is the technology stack used in your project?**
**Answer:** The project uses the MERN/Next.js stack:
*   **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4.
*   **Backend:** Next.js API Routes (Node.js environment).
*   **Database:** MongoDB via Mongoose.
*   **Language:** TypeScript.

**Q5: Why did you choose Next.js over traditional React (Create React App/Vite)?**
**Answer:** Next.js provides built-in Server-Side Rendering (SSR) for better performance, and its App Router simplifies routing. Crucially, it has built-in API routes, allowing me to build both the frontend and the backend within a single, cohesive project without needing to set up and host a separate Node.js/Express server.

**Q6: What is the role of Tailwind CSS in your project?**
**Answer:** Tailwind CSS is a utility-first CSS framework. It allowed me to rapidly style the application directly within the JSX/TSX files without writing separate CSS stylesheets. It was instrumental in creating a responsive, modern design efficiently.

**Q7: Why did you use TypeScript instead of regular JavaScript?**
**Answer:** TypeScript adds static typing to JavaScript. It helped me catch errors during development (compile-time) rather than at runtime. It also provided better code autocompletion and made handling database schemas and API responses much more predictable and robust.

## 3. Database Design (MongoDB)

**Q8: Why did you choose MongoDB for this project instead of a SQL database like MySQL?**
**Answer:** MongoDB is a NoSQL database that handles dynamic document schemas well. Because financial records and contact details can be flexible, the document-based structure of MongoDB (JSON-like BSON formats) was a great fit. It also integrates very smoothly with Node.js and Next.js via Mongoose.

**Q9: Can you explain the database schema of your application?**
**Answer:** The database has two primary collections:
1.  **Users:** Stores user authentication details (name, email, hashed password, recovery PIN, security answer).
2.  **Contacts:** Associated with a specific user. It stores contact info (name, phone) and contains an **embedded array** of transactions (amount, type: gave/got, date, category).

**Q10: Why did you embed transactions within the Contacts collection rather than creating a separate Transactions collection?**
**Answer:** Embedding the transactions inside the Contact document significantly optimizes database queries. When a user views a specific contact's ledger, all related transactions are retrieved in a single read operation, rather than performing complex JOINs or multiple queries which would be required in a normalized SQL-like structure.

## 4. Implementation Details

**Q11: How is user authentication handled?**
**Answer:** The system handles secure login and registration by hashing passwords before storing them in the database. It also includes a custom PIN and security question mechanism for password recovery to ensure users don't lose access to their financial data.

**Q12: How does the dashboard calculate the total balances?**
**Answer:** The backend fetches all contacts and their embedded transactions for the logged-in user. It then aggregates these transactions to calculate the total money to be received ("Got") and the total money owed ("Gave"). The frontend displays this dynamically using color-coded indicators (e.g., green for positive, red for negative).

**Q13: You mentioned using the Agile methodology. How did you apply it?**
**Answer:** I developed the project iteratively. Instead of building everything at once, I divided the work into phases: requirements, UI design, database schema, API development, and frontend integration. I continuously tested features and refined the UI/UX based on what was working well.

## 5. Challenges & Future Scope

**Q14: What was the most challenging part of developing this project?**
**Answer:** *(You can personalize this, but a good generic answer is:)* One of the main challenges was accurately aggregating the nested transaction data across all contacts to display real-time dashboard balances efficiently. Another challenge was ensuring the UI remained fully responsive and intuitive on mobile devices, as users are most likely to use this app on their phones.

**Q15: What are the future enhancements you plan for Udharwale?**
**Answer:** 
*   **WhatsApp/SMS Integration:** To send automated payment reminders.
*   **Multi-Currency Support:** For users dealing in different currencies.
*   **Data Export:** Allowing users to download their ledger in PDF or Excel format.
*   **Progressive Web App (PWA):** Making it installable natively on smartphones for better offline capabilities and push notifications.
