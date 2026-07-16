# 🧠 CareerMind AI

CareerMind AI is a highly advanced, full-stack AI career mentor designed to help job seekers, students, and professionals upskill and land their dream jobs. By leveraging the highly scalable **Google Gemini 3.1 Flash-Lite** model and **Firebase**, it acts as a personalized career coach, resume reviewer, and technical interviewer.

![CareerMind Banner](https://i.imgur.com/H1G6a33.png) <!-- Placeholder banner -->

## ✨ Features

- **📄 Resume Analyzer**: Upload or paste your resume. The AI parses the text and provides actionable feedback, formatting tips, and a keyword optimization score based on your target role.
- **🗺️ Skill Gap Analysis**: Takes your employment context into account (e.g., student vs. career switcher). Uses a dynamic, AI-generated multiple-choice assessment to pinpoint exact technical blind spots.
- **📚 Learning Roadmap**: Generates a customized, step-by-step curriculum with time estimates, milestones, and project ideas based on your skill gap.
- **🎤 Mock Interview Coach**: Simulates a technical or behavioral interview in real-time, providing immediate constructive feedback on your answers.
- **💬 AI Mentor Chat**: A persistent, context-aware chatbot that remembers your career goals, experience level, and past assessments to give highly tailored advice.
- **📈 Progress Tracking**: Gamified experience with XP, streaks, level-ups, and an interactive radar chart to visualize your skill growth over time.
- **🎨 Premium UI/UX**: Built with a stunning dark-glassmorphism aesthetic, featuring animated glowing orbs, smooth transitions, and a floating dock interface.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Design System**: Custom CSS with CSS Variables, Flexbox/Grid, and Keyframe Animations
- **Authentication**: Firebase Authentication (Email/Password & Google OAuth)
- **Database**: Firebase Firestore (NoSQL for user profiles, progress, and chat history)
- **AI Integration**: Serverless REST API integration with Google Gemini 3.1 Flash-Lite via Vercel Functions (`/api/gemini`)
- **Libraries**:
  - `Chart.js` for skill radar charts.
  - `PDF.js` for local, client-side Resume parsing.
  - `Lucide Icons` for sleek, modern iconography.

## 🚀 Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/careermind-ai.git
   cd careermind-ai
   ```

3. **Configure API Keys (Environment Variables)**:
   This app uses Vercel Serverless Functions to securely communicate with the Gemini API.
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   Open `firebase.js` and ensure your Firebase config is correct.

4. **Run a Local Server**:
   Because the app relies on Vercel Functions (`/api/gemini`), you must use the Vercel CLI to run the app locally.
   ```bash
   npm i -g vercel
   vercel dev
   ```

5. **Open the App**:
   Navigate to `http://localhost:3000` in your web browser.

## 🛡️ Privacy & Security
All resume parsing via PDF.js happens **locally** in the browser. Only the extracted text is sent to the Gemini AI for analysis. User data is securely stored in Google Firebase.

---
*Built with ❤️ for the future of work.*
