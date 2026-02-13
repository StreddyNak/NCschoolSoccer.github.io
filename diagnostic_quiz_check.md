# Spring 2026 Teamwork Quiz - Diagnostic Report

## Issues Found

### 1. Missing Questions (3 out of 15)
**Problem:** Only 12 questions are showing in the admin portal instead of 15.

**Root Cause:** The Google Apps Script filters questions by status on line 303:
```javascript
if (qName && (isPublic || isAllowed || isMaster) && quizStatus === 'active') {
```

**What to Check in Google Sheet:**
- Open your Google Sheet with the quiz questions
- Look at the "Spring 2026 Teamwork" quiz rows
- Check Column N (Status) for all 15 questions
- **The 3 missing questions likely have a status other than "active"**
  - Possible values: "inactive", "draft", "pending", or blank/empty

**How to Fix:**
- Option 1: Change the status of the 3 missing questions to "active" in Column N
- Option 2: If you want to show all questions regardless of status in the admin portal, we need to modify the Apps Script

### 2. Question Missing Header (Question #7)
**Problem:** One question (64% success rate, correct answer "Both B and C") has no header or question text displayed.

**Root Cause:** The question likely has empty values in:
- Column B (Question Header) - empty
- Column C (Question) - empty or whitespace only

**What to Check in Google Sheet:**
- Find the row for the question with correct answer "Both B and C" in the Spring 2026 Teamwork quiz
- Check if Column B (Question Header) is empty
- Check if Column C (Question) is empty or contains only spaces

**How to Fix:**
- Add the question header to Column B
- Add the full question text to Column C

## Questions Currently Showing (12 total):
1. Ball St. (57%)
2. HPU vs. UNCA (27%)
3. D3 (61%)
4. Ala vs. MS St. (39%)
5. HPU vs. SC Upstate (47%)
6. Manteo vs. Gray Stone Day (39%)
7. **(NO HEADER)** (64%) - Correct: "Both B and C"
8. Col vs. MSU (50%)
9. Pitt vs. Louisville (58%)
10. Campbell vs. Radford (49%)
11. Wake vs. Furman (46%)
12. Hough vs. Providence (42%)

## Next Steps

1. **Check the Google Sheet** for the Spring 2026 Teamwork quiz
2. **Identify the 3 missing questions** by comparing what's in the sheet vs. what's showing above
3. **Check their status** in Column N - they're probably not "active"
4. **Find question #7** (the one with no header) and fill in Column B and Column C
5. **Let me know** what you find, and I can help you decide whether to:
   - Update the sheet data, or
   - Modify the Apps Script to show questions with different statuses in the admin portal
