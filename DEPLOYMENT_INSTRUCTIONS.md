# 🔧 Fix for Missing Questions in Admin Portal

## Problem Identified
The admin portal was showing only **12 out of 15 questions** for the Spring 2026 Teamwork quiz because the Google Apps Script was filtering out questions that had no text in Column C (Question).

## Root Cause
In `girlsform_code.gs` (line 759), the condition was:
```javascript
if (quizName && questionText) {
```

This excluded questions that had:
- Only a header in Column B (Question Header)
- Empty or blank Column C (Question)

## Questions Affected
- **Duke vs. Clemson** - header only, no question text
- **SMC vs. SJSU** - header only, no question text
- **One other question** - likely also had empty Column C

## Fix Applied
Changed the condition to:
```javascript
if (quizName && (questionHeader || questionText)) {
```

This now includes questions with **EITHER** a header **OR** question text.

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### **You MUST deploy this fix to Google Apps Script for it to take effect!**

1. **Open Google Apps Script Editor:**
   - Go to your Google Sheet
   - Click **Extensions** → **Apps Script**

2. **Locate the File:**
   - Find the file `girlsform_code.gs` (or the file that contains the `enrichQuestionStatsWithVideos` function)

3. **Find Line 759:**
   - Use Ctrl+F (or Cmd+F) to search for: `if (quizName && questionText)`

4. **Replace the Line:**
   - **OLD:**
     ```javascript
           if (quizName && questionText) {
     ```
   - **NEW:**
     ```javascript
           // ⭐ FIXED: Allow questions with EITHER a header OR question text (not just question text)
           if (quizName && (questionHeader || questionText)) {
     ```

5. **Save the Script:**
   - Click the **Save** icon (💾) or press Ctrl+S (Cmd+S)

6. **Deploy:**
   - Click **Deploy** → **New deployment**
   - Or if you have an existing deployment, click **Deploy** → **Manage deployments** → Click the **Edit** icon (pencil) → **Version: New version** → **Deploy**

7. **Test:**
   - Refresh the admin portal
   - Login again
   - Go to Question Analysis → Spring 2026 Teamwork
   - **You should now see all 15 questions!**

---

## Expected Result After Deployment
✅ All 15 questions will appear in the admin portal  
✅ Questions with only headers (Duke vs. Clemson, SMC vs. SJSU) will display correctly  
✅ The question with no header will still show (but you should add a header to Column B for it)

---

## Note About the Question with No Header
The browser investigation found one question (64% success rate, correct answer "Both B and C") that has **NO header and NO question text**. This question will now appear in the admin portal, but it will be blank. You should:
1. Find this question in the Google Sheet
2. Add a header to Column B
3. Add question text to Column C (if applicable)
