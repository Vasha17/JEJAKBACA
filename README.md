# 📚 JejakBaca

> A smart, clean, and minimal PWA personal reading tracker for manga, manhwa, and novels.

**JejakBaca** is a web-based aggregator and archivist tool designed to centralize your reading progress across multiple platforms. It features AI-powered predictions, smart source tracking, rich note-taking, and offline capabilities via Supabase.

**🔗 Live Demo:** [https://jejakbaca.vercel.app](https://jejakbaca.vercel.app)

---

## 🛠️ Technologies

- **Framework:** `React 18 + Vite + TypeScript`
- **Styling:** `TailwindCSS + Shadcn/UI`
- **Database & Backend:** `Supabase` (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **Local Storage:** `Dexie.js `(IndexedDB wrapper for Offline-First architecture)
- **Rich Text Editor:** `Tiptap` (Headless editor framework)
- **Image Processing:** `react-easy-crop `(Image repositioning/cropping)
- **State Management:** `React Context API + TanStack Query`
- **Icons:** `Lucide React`
- **PWA:**` Vite Plugin PWA` (Manifest & Service Worker)

---

## ✨ Features

### 📖 Core Tracking
- **Smart Progress Tracking:** Quick update (+1) or manual input for chapters.
- **Version History (Undo):** Every change (Rating, Status, Chapter) is logged. You can "Undo" mistakes.
- **Arc Timeline:** Visualize story arcs (e.g., "East Blue Arc") with chapter ranges and colors.
- **AI Predictions:** Analyzes your reading history to predict the next release date and confidence level.

### 🔗 Where to Read (Smart Sources)
- **Multi-Source Support:** Add unlimited reading links per story.
- **Smart Sorting:** Sources auto-sorted by the highest available chapter.
- **Update Tracking:** Track up to 2 sources per story. Get notified if a source is ahead of your progress.
- **Link Checker:** Utility to verify if reading links are active or dead.
- **Read Now:** Floating Action Button (FAB) that auto-opens the best source.

### ✍️ Rich Content & Organization
- **Rich Text Notes:** Supports Bold, Italic, Headings, Lists, Links, and Spoiler tags.
- **Bookmarks:** Save specific chapters with personal notes.
- **Smart Tagging:** Manual tags, Global Tags, and AI-suggested tags based on metadata.
- **Custom Lists:** Organize stories into personalized categories (e.g., "Top Tier", "Paused").
- **Story Relations:** Link Prequels, Sequels, or Spin-offs (Internal or External).

### 🎨 UX & Interface
- **Adaptive UI:** Desktop Dashboard & Mobile Bottom Navigation with Bottom Sheets.
- **Dark/Light Mode:** Full theming support with Accent Color Picker.
- **Keyboard Shortcuts:** Power user controls (`N`, `S`, `R`, `Esc`, Arrows).
- **Quick View:** Preview story details without leaving the library page.

---

## ⌨️ Keyboard Shortcuts

JejakBaca is designed for power users who prefer keyboard navigation over mouse clicks.

- `N` : Increment current chapter by **+1**.
- `S` : Open the **Notes** dialog for quick logging.
- `R` : Open the **Rating** dialog (1-10 stars).
- `Esc` : Go **Back** to the Library / Close dialogs.
- `←` / `→` : Navigate to the **Previous** or **Next** story in the library list.
- `F` : Open the **Filter** panel to sort stories.
- `Cmd/Ctrl + K` : Focus the **Search** bar instantly.

---

## 🚀 The Process

I started by building the core architecture with React, TypeScript, and Vite, integrating TailwindCSS and Shadcn/UI for a sleek design system. I set up Supabase for the backend and Dexie.js to handle offline-first data storage, ensuring the app works without internet.

Next, I focused on the central data model using React Context. I built the main Library views (Grid & Timeline) and implemented a complex Filtering system. I also integrated Tiptap for a custom Rich Text Editor, allowing users to write detailed notes with formatting.

The advanced phase involved creating the **Smart Source** system (auto-sorting links, update tracking) and the **Auto-Fill Add Story** feature using Supabase Edge Functions to scrape metadata. I also built the **Arc Timeline** and **AI Predictions** to enhance the tracking experience.

Finally, I polished the UI by adding image cropping tools, mobile Bottom Sheets, and a robust **Sync Engine** to merge local data with the cloud. After optimizing performance, I deployed the project to Vercel.

By building JejakBaca, I learned how crucial it is to design a flexible data model early on, especially when dealing with nested entities like stories, notes, and sources. The biggest challenge was implementing the offline sync logic, which taught me a lot about conflict resolution and asynchronous operations. This project significantly improved my skills in TypeScript and my understanding of building scalable, production-ready web applications

---

## 🧠 What I Learned

- **Complex State Management:** Managing deeply nested data structures (Stories containing Notes, Sources, History) using React Context effectively.
- **Offline-First Patterns:** Understanding how to design a "Single Source of Truth" (Dexie) locally and sync it asynchronously with a cloud database.
- **TypeScript Mastery:** Leveraging strict typing to prevent bugs, especially in data transformation logic (normalizing tags, filtering arrays).
- **Async Logic & UX:** Handling loading states gracefully (Skeleton screens) and implementing Optimistic UI to make the app feel instant.
- **PWA Development:** Configuring Service Workers and Manifests to make the web app installable on mobile devices.

---

## 📈 Overall Growth

Building JejakBaca marked a significant transition in my development journey from building simple UI components to architecting a full-scale, production-ready application. I developed a deeper understanding of **data architecture**, specifically how to structure complex relational data in a NoSQL environment (Supabase/JSONB) while maintaining type safety with TypeScript. 

Beyond technical skills, I improved my **problem-solving endurance**. The challenges of implementing offline sync and handling optimistic updates required me to think several steps ahead about user interactions and potential race conditions. This project also honed my ability to write clean, maintainable code, as I had to refactor state management multiple times to accommodate new features like AI predictions and Arc timelines without breaking existing functionality.

---

## 🔮 How It Can Be Improved

While JejakBaca is fully functional, there are several areas for future enhancement:

- **Community Features:** Currently, the app is strictly personal. Adding social features like sharing public lists or following friends could make it more engaging.
- **Enhanced AI:** The prediction model is currently based on simple averages. Integrating a more advanced machine learning model via Python could provide more accurate release dates.
- **Mobile App Wrapper:** Although it is a PWA, wrapping it in React Native or Capacitor would allow for deeper OS integration (push notifications, native widgets).
- **Advanced Analytics:** Adding a dashboard to visualize reading statistics (e.g., "Pages read this month," "Genre distribution") would provide more value to users.
- **Testing:** While the core logic is solid, expanding the test coverage with E2E tests using Playwright or Cypress would ensure higher stability for future updates.

---

## 🚀 Running the Project

The project is live on Vercel! You can access it immediately without installing anything.

### **🌐 Live URL:** [https://jejakbaca.vercel.app](https://jejakbaca.vercel.app)

### Local Development
If you want to run it locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/username/jejakbaca.git
    cd jejakbaca
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Start the development server**
    ```bash
    npm run dev
    ```

5.  **Open your browser**
    Navigate to `http://localhost:5173`
