# CAPSTONE PROJECT REPORT

## Cover Page Information (Refer to Annexure-II)
**Topic:** Udharwale: A Personal Ledger and Debt Tracking Web App
**Submitted in partial fulfilment of the requirements for the Award of the degree of:** [Your Degree, e.g., Master of Computer Applications (MCA)]
**By:** [Your Name]
**Registration Number:** [Your Registration Number]
**University:** Centre for Distance and Online Education, LOVELY PROFESSIONAL UNIVERSITY, PHAGWARA, PUNJAB

---

## Declaration by the Student
I, **[Your Name]**, Registration Number **[Your Registration Number]**, hereby declare that the work done by me on "Udharwale: A Personal Ledger and Debt Tracking Web App", is a record of original work for the partial fulfilment of the requirements for the award of the degree, **[Your Programme Name]**.

Name of the Student: ___________________
Signature of the student: ___________________
Dated: ___________________

---

## Acknowledgement
I would like to express my profound gratitude to everyone who supported me throughout the course of this capstone project. I am deeply thankful to my faculty and the Centre for Distance and Online Education at Lovely Professional University for providing the guidelines and platform to implement my theoretical knowledge into a practical application. 

---

## Abstract
Informal lending and borrowing among friends, family, and local businesses is a widespread practice. However, tracking these transactions manually often leads to errors, confusion, and financial discrepancies. "Udharwale" is a web-based financial ledger application designed to address this societal problem by digitizing personal debt management. Developed using modern web technologies—Next.js, React, Tailwind CSS, and MongoDB—the application provides a secure, intuitive platform for users to log and manage their financial exchanges. The system allows users to categorize transactions as "Gave" or "Got," maintains a dynamic dashboard of overall balances, and includes secure user authentication. This report details the design, implementation, and results of the Udharwale application, demonstrating its potential to simplify informal credit tracking.

---

## Table of Contents
1. Declaration by Student
2. Acknowledgement
3. Abstract
4. Chapter-1: Introduction
5. Chapter-2: Review of Literature
6. Chapter-3: Implementation of project
7. Chapter-4: Results and Discussions
8. Final Chapter: Conclusion and Future Scope
9. References

---

# Chapter 1: Introduction

## 1.1 Aim of the Project
The primary aim of the "Udharwale" project is to develop a user-friendly, secure, and efficient web-based application that replaces traditional paper-based ledgers and diaries used for tracking informal debts and credits.

## 1.2 Importance and Relevance
In many communities, financial transactions such as borrowing small amounts of cash, splitting bills, or taking goods on credit from local shops are common. Keeping track of these micro-transactions is difficult. Misplaced notes or memory lapses often lead to strained relationships and financial loss. Udharwale is highly relevant as it brings digitalization to everyday micro-finance, offering transparency and accountability.

## 1.3 Applicability
This application is widely applicable to:
- **Individuals:** For tracking money lent to or borrowed from friends and family.
- **Small Business Owners (Shopkeepers):** For keeping a digital "Khata" (ledger) of customers who buy on credit.
- **Students:** For managing shared expenses like rent, food, and travel.

## 1.4 Scope of the Proposed Work
The current scope of the project encompasses:
- Secure user registration and authentication with PIN recovery.
- A central dashboard providing an overview of total money to be received ("Got") and money to be paid ("Gave").
- Contact management to associate transactions with specific individuals.
- Categorized transaction logging (e.g., Food, Travel, Rent, Business).
- A responsive user interface accessible across mobile and desktop devices.

---

# Chapter 2: Review of Literature

## 2.1 Overview of Personal Finance Management
Personal finance management tools have evolved significantly from physical ledgers to complex desktop software, and now to mobile-first cloud applications. The digital transformation has made it easier to track income and expenses automatically. However, informal debt tracking remains a niche that requires specialized, simple interfaces.

## 2.2 Existing Systems
Several systems exist in the market that attempt to solve similar problems:
- **Splitwise:** Focuses primarily on splitting group expenses and calculating who owes whom. While powerful, it can be overly complex for simple one-on-one "give and take" transactions.
- **KhataBook:** A highly popular app in India tailored specifically for small and medium businesses. It is heavily feature-oriented towards merchants, invoicing, and SMS reminders.

## 2.3 Gaps in Existing Work
While Splitwise is excellent for groups, and KhataBook is excellent for merchants, there is a distinct lack of simple, generalized web applications designed for the everyday individual who just wants to track simple "I gave X" and "I got Y" transactions without navigating complex group dynamics or business accounting features. 

## 2.4 Need for the Proposed Work
Udharwale fills this gap by offering a minimalist, straightforward approach to personal debt tracking. It strips away unnecessary complexities, focusing purely on managing contacts and recording binary financial exchanges (gave/got), making it accessible to users with minimal technical literacy.

---

# Chapter 3: Implementation of Project

## 3.1 Objectives
- To design a responsive and intuitive user interface.
- To implement a secure backend system with a robust database.
- To ensure data integrity and real-time calculation of balances.

## 3.2 Methodology
The project follows an Agile development methodology, allowing for iterative development, continuous testing, and rapid incorporation of UI/UX improvements. The development was divided into phases: Requirements Gathering, UI/UX Design, Database Schema Design, Backend API Development, Frontend Integration, and Testing.

## 3.3 Tools and Technologies
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4. Next.js was chosen for its server-side rendering capabilities and seamless API integration. Tailwind CSS provided rapid utility-first styling.
- **Backend:** Next.js API Routes (Node.js environment).
- **Database:** MongoDB via Mongoose. MongoDB, a NoSQL database, was selected for its flexibility in handling dynamic document schemas.
- **Language:** TypeScript for strong typing and error reduction during development.

## 3.4 Database Design
The database consists of two primary collections:
1. **Users:** Stores authentication details, including `name`, `email`, hashed `password`, `recoveryPin`, and `securityAnswer`.
2. **Contacts:** Maps to a specific `userId` and stores contact details (`name`, `phone`, `email`). It contains an embedded array of `transactions`, where each transaction holds `amount`, `type` ('gave' or 'got'), `description`, `date`, and `category`.

## 3.5 System Modules
- **Authentication Module:** Handles secure login, registration, and password recovery using a custom PIN and security question.
- **Dashboard Module:** Fetches and aggregates all transactions to display the total outstanding balances.
- **Contact Management Module:** Allows users to add, edit, and view individual contacts.
- **Transaction Module:** Enables adding new financial records tied to specific contacts and updates the aggregated totals instantly.

---

# Chapter 4: Results and Discussions

## 4.1 Overview of Results
The implementation of "Udharwale" was successful. The application meets all the predefined objectives, providing a seamless experience for tracking personal debts. The integration of Next.js and MongoDB resulted in fast load times and reliable data storage.

## 4.2 User Interface and Experience
*(Note for the student: You must take screenshots of your running application and insert them below before converting this to a PDF)*

- **Figure 4.1: Login and Registration Screen**
  [INSERT SCREENSHOT HERE: Show the login page]
  *Discussion:* The authentication screens are designed to be clean and welcoming, ensuring users can quickly access their accounts.

- **Figure 4.2: Main Dashboard**
  [INSERT SCREENSHOT HERE: Show the main dashboard]
  *Discussion:* The dashboard accurately calculates the net balance. Green and red indicators are used to clearly distinguish between money to be received and money owed.

- **Figure 4.3: Contact and Transaction View**
  [INSERT SCREENSHOT HERE: Show the inside of a contact with transactions]
  *Discussion:* The transaction history is displayed chronologically, making it easy to audit past exchanges.

## 4.3 Discussions
The testing phase revealed that the choice of embedded documents for transactions (within the Contact model) significantly reduced database query times, as all transactions for a contact are retrieved in a single read operation. The responsive design ensures that the application is fully functional on mobile browsers, which is crucial for users who need to log transactions on the go.

---

# Final Chapter: Conclusion and Future Scope

## 5.1 Conclusion
The "Udharwale" project successfully demonstrates the application of modern web development technologies to solve a practical, everyday problem. By providing a digital alternative to physical ledgers, the application reduces the cognitive load of remembering informal debts and minimizes the risk of financial disputes among peers. The project met all its functional requirements and provides a solid foundation for personal finance management.

## 5.2 Future Scope
While the current version is fully functional, several features can be added in the future to enhance its utility:
- **WhatsApp/SMS Integration:** Automated reminders to contacts for pending payments.
- **Multi-Currency Support:** Allowing users to log transactions in different currencies.
- **Data Export:** Providing an option to export transaction histories to PDF or Excel formats.
- **Push Notifications:** Reminding the user of long-pending debts.
- **Progressive Web App (PWA):** Converting the website into a PWA so it can be installed natively on smartphones.

---

# References

1. Next.js Documentation. Vercel. Retrieved from https://nextjs.org/docs
2. MongoDB Documentation. MongoDB Inc. Retrieved from https://www.mongodb.com/docs/
3. Tailwind CSS Documentation. Tailwind Labs. Retrieved from https://tailwindcss.com/docs
4. React Documentation. Meta. Retrieved from https://react.dev/learn
5. Mongoose ODM Documentation. Automattic. Retrieved from https://mongoosejs.com/docs/
