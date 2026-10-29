# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router, TypeScript) + Firebase (Cloud Firestore for real-time Khatma and Juz' state synchronization, Firebase Anonymous Auth for frictionless device/session ownership) + Static Tanzil.net Uthmani Quran JSON data split into 30 per-Juz' files.

## Users
Groups of Arabic-speaking friends, families, or community members—primarily accessing the app on mobile phones via shared links (e.g., WhatsApp, Telegram)—coordinating to complete a full Quran reading (Khatma) together.

## Product Purpose
Enables anyone to create a dedicated Quran Khatma with a title, intention (niyyah), and target completion date, generate a shareable link, and allow participants to claim any of the 30 Juz' cards, read the Uthmani Quran text directly in the browser, and mark their Juz' as completed. Success means zero-friction participation on mobile, real-time visibility of which Juz' are available/reserved/completed, and a serene, distraction-free reading experience.

## Positioning
Unlike static checklists or external spreadsheets where participants only log their name and have to switch to another app to read, Khatma unifies real-time group coordination (30 Juz' cards with live status and optional anonymous name privacy) with an integrated, mobile-first Uthmani Quran reader powered by Tanzil.net data and automatic bookmarking.

## Operating Context
Shared primarily in chat groups (WhatsApp/Telegram) for occasions like Ramadan, Fridays, charity intentions, or prayers for a loved one. Used on mobile browsers in varied lighting conditions, requiring fast loading, instant touch responsiveness, and clear Arabic typography (Uthmani script for Quran text, crisp Arabic UI typeface for controls).

## Capabilities and Constraints
- **Multiple Khatmas:** Any visitor can create a new Khatma (Name, Intention/Niyyah, Target Reading Date) and receive a unique shareable URL (`/khatma/[id]`).
- **30 Juz' Grid:** Displays all 30 Juz' as cards showing Juz' number, traditional Arabic Juz' name, start/end Surah & Ayah info, and current status (`available`, `reserved`, `completed`).
- **Reservation & Privacy:** Tapping an available Juz' card prompts the user for their name and offers a toggle to hide their name publicly (displaying "فاعل خير" / hidden to others while storing the actual name). Ownership is tied to the user's device/session via Firebase Anonymous Auth + `localStorage`.
- **In-App Quran Reader & Audio Recitation (Tanzil.net + Audio CDN):** Once a user reserves a Juz' (or taps a Juz' they already reserved), the full text of that Juz' from Tanzil.net (Uthmani script) opens directly in a dedicated reader view with Surah headers, Basmala, verse numbers, font-size control, audio recitation with selectable reciters (Yasser Al-Dosari, Mohamed Siddiq El-Minshawi, Abdulbasit Abdulsamad, Islam Sobhi, Mishary Alafasy, Mahmoud Khalil Al-Hussary) and active-ayah highlighting, automatic scroll/ayah bookmarking, an option to release/unreserve the Juz', and a prominent button at the end to mark the Juz' as completed ("أتممت القراءة").
- **Mobile-First & RTL:** Strictly RTL (`dir="rtl"`, `lang="ar"`) layout designed primarily for mobile viewports, following `emil-design-eng` interaction principles (tactile `:active` scale feedback, custom `cubic-bezier` ease-out transitions, velocity-aware drawers/modals, hardware-accelerated transforms).

## Evidence on Hand
- Quran text source specified by user: Tanzil.net (`https://tanzil.net/download/`, Uthmani script with Juz', Surah, and Ayah metadata).

## Product Principles
1. **Zero Friction to Good Deeds:** Never block participation behind email/password sign-ups; claiming and reading a Juz' takes two taps from a shared link.
2. **Sincerity & Privacy First:** Respect the user's choice to keep their contribution anonymous ("إخفاء الاسم") while preserving clear group coordination.
3. **Sacred Text Reverence:** Present the Quranic text from Tanzil.net with authentic Uthmani typography, generous breathing room, and zero visual clutter.
4. **Tactile Mobile Craft:** Every tap, sheet transition, and state change on mobile must feel immediate, intentional, and physically grounded.

## Accessibility & Inclusion
- Full RTL support (`dir="rtl"`), adjustable Quran font sizing for older readers or small screens, high contrast legibility, and `prefers-reduced-motion` support.
