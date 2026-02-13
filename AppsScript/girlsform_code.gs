// Form Responses Apps Script - WITH ELIGIBILITY SUPPORT + VIDEO LINKS

// ===== CONFIGURATION: DATA SOURCES =====
const DATA_SOURCES = {
  'Current': { type: 'active', tabName: 'CMI Reports' },
  'Boys 2023': { type: 'external', id: '1GJY6r9utOnFdioyAA7ThxzFsYBW1arhg4EaQZhOfakw', tabName: 'Form Responses 1' },
  'Girls 2024': { type: 'external', id: '1DplUoTda7rtOwVwKpPG9sDjdrSUAtGQmnXFpPXXwT5U', tabName: 'Form Responses 1' },
  'Boys 2024': { type: 'external', id: '17YjTWiANjK5429Yu61f6Wx9ZBCsngWpU2817irFUUWs', tabName: 'Everything' },
  'Girls 2025': { type: 'external', id: '16YrH_z93no9Q1swNhFeufgbsn_dAqQz7ENqsITWfrEw', tabName: 'Everything' },
  'Boys 2025': { type: 'external', id: '1njQbRVbY5Tw1qNfged_UQ9qrzdTjQWvxA5U56WTZIXo', tabName: 'Everything' }
};

// Quiz Spreadsheet ID for eligibility data and video URLs
const QUIZ_SHEET_ID = "1mYw8YdF5-Y4IsZfpo1PilNSfz4QC82aQVG6uBSYMogM";

// ===== MAIN REQUEST HANDLER =====
function doGet(e) {
  var params = e.parameter;
  var action = params.action;
  var season = params.season || 'Current';

  if (action === 'googleLogin') {
    return handleAdminLogin(params.token, season);
  }
  
  // Password-based login
  if (action === 'passwordLogin') {
    return handlePasswordLogin(params.email, params.password, season);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ready", message: "CMI Backend Online"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== HANDLE FORM SUBMISSIONS =====
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. HANDLE QUIZ RESULTS
    if (data.type === 'quiz_result') {
      var sheet = ss.getSheetByName("Quiz Results");
      if (!sheet) {
        sheet = ss.insertSheet("Quiz Results");
        sheet.appendRow(["Timestamp", "First Name", "Last Name", "Email", "Quiz Name", "Score", "Percent", "Group"]);
      }
      
      // Store summary result
      sheet.appendRow([
        new Date(), 
        data.firstName, 
        data.lastName, 
        data.email, 
        data.quizName, 
        data.score, 
        data.percent,
        data.group || "Unknown"
      ]);
      
      // Store detailed question results if provided
      if (data.questionResults && data.questionResults.length > 0) {
        var questionSheet = ss.getSheetByName("Question Results");
        if (!questionSheet) {
          questionSheet = ss.insertSheet("Question Results");
          questionSheet.appendRow([
            "Timestamp", "Email", "Name", "Group", "Quiz", "Q#", "Question", 
            "Student Answer", "Correct Answer", "Is Correct"
          ]);
        }
        
        var fullName = data.firstName + " " + data.lastName;
        var studentGroup = data.group || "Unknown";
        
        data.questionResults.forEach(function(qResult) {
          questionSheet.appendRow([
            new Date(),
            data.email,
            fullName,
            studentGroup,
            data.quizName,
            qResult.questionNumber,
            qResult.questionText,
            qResult.studentAnswer,
            qResult.correctAnswer,
            qResult.isCorrect
          ]);
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. HANDLE CMI REPORTS (Default)
    var sheet = ss.getSheetByName("CMI Reports");
    if (!sheet) {
      sheet = ss.insertSheet("CMI Reports");
      sheet.appendRow(["Ref Name", "Date", "Supervisor", "Level", "Home", "Away", "Type", "Half", "Time Remaining", "Notes", "Timestamp", "Video Link"]);
    }
    
    sheet.appendRow([
      data.refName, data.gameDate, data.supervisor, data.gameLevel, 
      data.homeTeam, data.awayTeam, data.cmiType, data.half, 
      data.timeRemaining, data.notes, new Date(), data.video
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== PASSWORD LOGIN HANDLER =====
function handlePasswordLogin(email, password, seasonKey) {
  try {
    if (!email || !password) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Email and password are required' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    email = email.toLowerCase().trim();
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admins");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Admins tab not found in spreadsheet' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(h => String(h).toLowerCase().trim());
    
    var nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('supervisor'));
    var supervisorIdx = headers.findIndex(h => h.includes('assigned') || h.includes('supervisor'));
    var emailIdx = headers.findIndex(h => h.includes('email'));
    var passwordIdx = headers.findIndex(h => h.includes('password'));
    var regionIdx = headers.indexOf('region');

    if (emailIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Admins tab missing Email column' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (passwordIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Admins tab missing Password column' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var assignedSupervisor = null;
    var supervisorRegion = null;
    
    // Find the admin by email and verify password
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][emailIdx]).toLowerCase().trim();
      
      if (rowEmail === email) {
        var storedPassword = String(data[i][passwordIdx]).trim();
        
        if (storedPassword !== password) {
          return ContentService.createTextOutput(JSON.stringify({ 
            status: 'error', 
            message: 'Invalid password' 
          })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // The "Assigned Supervisor" column already has the full name with region
        var supName = (supervisorIdx > -1) ? String(data[i][supervisorIdx]).trim() : "MASTER";
        var region = (regionIdx > -1) ? String(data[i][regionIdx]).trim() : "";
        
        // Use the supervisor name as-is (it already includes region)
        assignedSupervisor = supName;
        
        // Extract just the region for filtering quiz results
        if (supName === "MASTER" || region === "MASTER") {
          supervisorRegion = "MASTER";
        } else {
          supervisorRegion = region;
        }
        
        break;
      }
    }

    if (!assignedSupervisor) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Access denied. Email not found.\n\nEmail: ' + email 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log("Login successful for: " + email);
    Logger.log("Assigned Supervisor: " + assignedSupervisor);
    Logger.log("Supervisor Region: " + supervisorRegion);

    var reports = getCMIReports(assignedSupervisor, seasonKey);
    Logger.log("CMI reports found: " + reports.length);
    
    var quizzes = getQuizResults(supervisorRegion);
    Logger.log("Quiz results found: " + quizzes.length);
    
    var questionStats = getQuestionStats(supervisorRegion);
    Logger.log("Question stats found: " + questionStats.length);
    
    // ⭐ NEW: Add video URLs to question stats (one per unique question)
    questionStats = enrichQuestionStatsWithVideos(questionStats);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', 
      supervisor: assignedSupervisor,
      season: seasonKey, 
      data: reports, 
      quizzes: quizzes,
      questionStats: questionStats
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    Logger.log("ERROR in handlePasswordLogin: " + e.message);
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: 'Server error: ' + e.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== ADMIN LOGIN HANDLER (GOOGLE OAUTH - BACKUP) =====
function handleAdminLogin(token, seasonKey) {
  try {
    // Decode JWT token to get email
    var parts = token.split('.');
    var payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(parts[1])).getDataAsString());
    var email = payload.email.toLowerCase();

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Admins");
    if (!sheet) throw new Error("Tab 'Admins' not found");

    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(h => String(h).toLowerCase().trim());
    
    var emailIdx = headers.indexOf('email');
    var supervisorIdx = headers.findIndex(h => h.includes('assigned') || h.includes('supervisor'));
    var regionIdx = headers.indexOf('region');

    if (emailIdx === -1) throw new Error("Admins tab missing 'Email' column");

    var assignedSupervisor = null;
    var supervisorRegion = null;
    var supervisorNameOnly = null;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][emailIdx]).toLowerCase().trim() === email) {
        var supName = (supervisorIdx > -1) ? String(data[i][supervisorIdx]).trim() : "MASTER";
        var region = (regionIdx > -1) ? String(data[i][regionIdx]).trim() : "";
        
        supervisorNameOnly = supName;
        
        if (supName === "MASTER" || region === "MASTER") {
          assignedSupervisor = "MASTER";
          supervisorRegion = "MASTER";
          supervisorNameOnly = "MASTER";
        } else if (region) {
          assignedSupervisor = supName + " (" + region + ")";
          supervisorRegion = region;
        } else {
          assignedSupervisor = supName;
          supervisorRegion = "";
        }
        break;
      }
    }

    if (!assignedSupervisor) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Access denied. Your email is not authorized.\n\nEmail: ' + email 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var reports = getCMIReports(supervisorNameOnly, seasonKey);
    var quizzes = getQuizResults(supervisorRegion);
    var questionStats = getQuestionStats(supervisorRegion);
    
    // ⭐ NEW: Add video URLs to question stats (one per unique question)
    questionStats = enrichQuestionStatsWithVideos(questionStats);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', 
      supervisor: assignedSupervisor, 
      season: seasonKey, 
      data: reports, 
      quizzes: quizzes,
      questionStats: questionStats
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: e.message + '\n\nStack: ' + e.stack 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== GET ELIGIBILITY DATA FROM QUIZ SPREADSHEET =====
function getEligibilityData() {
  var eligibilityMap = {};
  
  if (QUIZ_SHEET_ID === "YOUR_QUIZ_SHEET_ID_HERE") {
    Logger.log("WARNING: QUIZ_SHEET_ID not configured - eligibility data unavailable");
    return eligibilityMap;
  }
  
  try {
    var quizSS = SpreadsheetApp.openById(QUIZ_SHEET_ID);
    var rosterSheet = quizSS.getSheetByName("Roster");
    
    if (!rosterSheet) {
      Logger.log("Roster sheet not found in Quiz spreadsheet");
      return eligibilityMap;
    }
    
    var rosterData = rosterSheet.getDataRange().getValues();
    
    for (var i = 1; i < rosterData.length; i++) {
      var email = String(rosterData[i][0]).toLowerCase().trim();
      
      // Column G (index 6) = Attended 1 checkbox
      // Column J (index 9) = Attended 2 checkbox
      var attended1 = rosterData[i][6] === true || rosterData[i][6] === "TRUE";
      var attended2 = rosterData[i][9] === true || rosterData[i][9] === "TRUE";
      
      var scrimmagesAttended = 0;
      if (attended1) scrimmagesAttended++;
      if (attended2) scrimmagesAttended++;
      
      eligibilityMap[email] = {
        scrimmagesAttended: scrimmagesAttended,
        regularEligible: scrimmagesAttended >= 1,
        playoffEligible: scrimmagesAttended >= 2,
        scrimmage1Attended: attended1,
        scrimmage2Attended: attended2
      };
    }
    
    Logger.log("Loaded eligibility data for " + Object.keys(eligibilityMap).length + " students");
    
  } catch (err) {
    Logger.log("Error fetching eligibility data: " + err.toString());
  }
  
  return eligibilityMap;
}

// ===== GET QUIZ RESULTS (WITH ELIGIBILITY DATA + ALL ROSTER STUDENTS) =====
function getQuizResults(supervisorRegion) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Quiz Results");
  
  var eligibilityMap = getEligibilityData();
  var allRosterStudents = getAllRosterStudents(supervisorRegion);
  
  if (!sheet) {
    Logger.log("Quiz Results sheet not found - returning roster students only");
    return allRosterStudents.map(function(student) {
      return {
        date: "",
        name: student.name,
        email: student.email,
        quiz: "",
        score: "",
        percent: "",
        group: student.group,
        scrimmagesAttended: student.scrimmagesAttended,
        regularEligible: student.regularEligible,
        playoffEligible: student.playoffEligible,
        scrimmage1: student.scrimmage1,
        scrimmage2: student.scrimmage2
      };
    });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("No quiz results data found - returning roster students only");
    return allRosterStudents.map(function(student) {
      return {
        date: "",
        name: student.name,
        email: student.email,
        quiz: "",
        score: "",
        percent: "",
        group: student.group,
        scrimmagesAttended: student.scrimmagesAttended,
        regularEligible: student.regularEligible,
        playoffEligible: student.playoffEligible,
        scrimmage1: student.scrimmage1,
        scrimmage2: student.scrimmage2
      };
    });
  }

  var headers = data[0];
  var quizResultsByEmail = {};
  
  // Group quiz results by email
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    
    if (!r[3] || !r[4]) continue;
    
    var studentEmail = String(r[3]).toLowerCase().trim();
    var studentGroup = (r[7]) ? String(r[7]).trim() : "Unknown";
    
    // FILTER BY SUPERVISOR REGION
    if (supervisorRegion !== "MASTER") {
      var normalizedStudentGroup = studentGroup.toLowerCase().trim();
      var normalizedSupervisorRegion = supervisorRegion.toLowerCase().trim();
      
      if (normalizedStudentGroup !== normalizedSupervisorRegion &&
          !normalizedStudentGroup.includes(normalizedSupervisorRegion) &&
          !normalizedSupervisorRegion.includes(normalizedStudentGroup)) {
        continue;
      }
    }
    
    if (!quizResultsByEmail[studentEmail]) {
      quizResultsByEmail[studentEmail] = [];
    }
    
    // Parse fractional score
    var rawScore = r[5];
    var fractionalScore = "";
    if (rawScore instanceof Date) {
      fractionalScore = (rawScore.getMonth() + 1) + "/" + rawScore.getDate();
    } else if (typeof rawScore === 'string' && rawScore.includes('/')) {
      fractionalScore = rawScore;
    } else {
      fractionalScore = String(rawScore);
    }
    
    // Parse percentage
    var percentNum = 0;
    if (typeof r[6] === 'number') {
      percentNum = r[6] > 1 ? r[6] : r[6] * 100;
    } else if (typeof r[6] === 'string') {
      percentNum = parseFloat(r[6].replace('%', '')) || 0;
    }
    
    // If percentage is missing but we have fractional score, calculate it
    if (percentNum === 0 && fractionalScore.includes('/')) {
      var parts = fractionalScore.split('/');
      if (parts.length === 2) {
        var earned = parseFloat(parts[0]);
        var total = parseFloat(parts[1]);
        if (total > 0) {
          percentNum = Math.round((earned / total) * 100);
        }
      }
    }
    
    quizResultsByEmail[studentEmail].push({
      date: formatDate(r[0]),
      quiz: String(r[4]),
      score: fractionalScore,
      percent: percentNum,
      group: studentGroup
    });
  }
  
  // Merge all roster students with their quiz results
  var allStudents = [];
  
  allRosterStudents.forEach(function(student) {
    var quizResults = quizResultsByEmail[student.email] || [];
    
    if (quizResults.length > 0) {
      quizResults.forEach(function(quiz) {
        allStudents.push({
          date: quiz.date,
          name: student.name,
          email: student.email,
          quiz: quiz.quiz,
          score: quiz.score,
          percent: String(quiz.percent),
          group: student.group,
          scrimmagesAttended: student.scrimmagesAttended,
          regularEligible: student.regularEligible,
          playoffEligible: student.playoffEligible,
          scrimmage1: student.scrimmage1,
          scrimmage2: student.scrimmage2
        });
      });
    } else {
      allStudents.push({
        date: "",
        name: student.name,
        email: student.email,
        quiz: "",
        score: "",
        percent: "",
        group: student.group,
        scrimmagesAttended: student.scrimmagesAttended,
        regularEligible: student.regularEligible,
        playoffEligible: student.playoffEligible,
        scrimmage1: student.scrimmage1,
        scrimmage2: student.scrimmage2
      });
    }
  });
  
  Logger.log("Returning " + allStudents.length + " student records (roster + quiz results)");
  return allStudents;
}

// ===== GET ALL STUDENTS FROM ROSTER =====
function getAllRosterStudents(supervisorRegion) {
  var students = [];
  
  if (QUIZ_SHEET_ID === "YOUR_QUIZ_SHEET_ID_HERE") {
    Logger.log("WARNING: QUIZ_SHEET_ID not configured");
    return students;
  }
  
  try {
    var quizSS = SpreadsheetApp.openById(QUIZ_SHEET_ID);
    var rosterSheet = quizSS.getSheetByName("Roster");
    
    if (!rosterSheet) {
      Logger.log("Roster sheet not found");
      return students;
    }
    
    var rosterData = rosterSheet.getDataRange().getValues();
    
    for (var i = 1; i < rosterData.length; i++) {
      var email = String(rosterData[i][0]).toLowerCase().trim();
      if (!email) continue;
      
      var firstName = String(rosterData[i][1] || "").trim();
      var lastName = String(rosterData[i][2] || "").trim();
      var group = String(rosterData[i][3] || "Unknown").trim();
      
      // FILTER BY SUPERVISOR REGION
      if (supervisorRegion !== "MASTER") {
        var normalizedGroup = group.toLowerCase().trim();
        var normalizedRegion = supervisorRegion.toLowerCase().trim();
        
        if (normalizedGroup !== normalizedRegion &&
            !normalizedGroup.includes(normalizedRegion) &&
            !normalizedRegion.includes(normalizedGroup)) {
          continue;
        }
      }
      
      var attended1 = rosterData[i][6] === true || rosterData[i][6] === "TRUE";
      var attended2 = rosterData[i][9] === true || rosterData[i][9] === "TRUE";
      
      var scrimmagesAttended = 0;
      if (attended1) scrimmagesAttended++;
      if (attended2) scrimmagesAttended++;
      
      students.push({
        email: email,
        name: (firstName + " " + lastName).trim(),
        group: group,
        scrimmagesAttended: scrimmagesAttended,
        regularEligible: scrimmagesAttended >= 1,
        playoffEligible: scrimmagesAttended >= 2,
        scrimmage1: attended1,
        scrimmage2: attended2
      });
    }
    
    Logger.log("Loaded " + students.length + " students from roster for region: " + supervisorRegion);
    
  } catch (err) {
    Logger.log("Error fetching roster students: " + err.toString());
  }
  
  return students;
}

// ===== GET QUESTION STATISTICS (FILTERED BY SUPERVISOR REGION) =====
// ===== GET QUESTION STATISTICS (FILTERED BY SUPERVISOR REGION) =====
// ⭐ REWRITTEN to show ALL questions from Quiz Questions sheet
// and correctly handle questions with duplicate/empty text (by checking Q#)
function getQuestionStats(supervisorRegion) {
  try {
    if (QUIZ_SHEET_ID === "YOUR_QUIZ_SHEET_ID_HERE") {
      Logger.log("WARNING: QUIZ_SHEET_ID not configured");
      return [];
    }
    
    var quizSS = SpreadsheetApp.openById(QUIZ_SHEET_ID);
    var questionsSheet = quizSS.getSheetByName('Quiz Questions');
    
    if (!questionsSheet) {
      Logger.log("Quiz Questions sheet not found");
      return [];
    }
    
    // --- STEP 1: LOAD MASTER LIST OF QUESTIONS ---
    var questionsData = questionsSheet.getDataRange().getValues();
    
    // We need to support multiple questions having the same Text (or empty Text).
    // Map: "QuizName|QuestionText" => [QuestionObject, QuestionObject...]
    var masterQuestionsMap = {};
    var allQuestionsList = [];
    
    // Column A = Quiz Name, B = Question Header, C = Question Text, D = Video URL, 
    // E-J = Options, K = Correct Answer, L = Explanation, M = Assign to Group, N = Status
    for (var i = 1; i < questionsData.length; i++) {
      var quizName = String(questionsData[i][0] || '').trim();
      var questionHeader = String(questionsData[i][1] || '').trim();
      var questionText = String(questionsData[i][2] || '').trim(); // May be empty duplicates
      var videoUrl = String(questionsData[i][3] || '').trim();
      var correctAnswer = String(questionsData[i][10] || '').trim();
      var assignToGroup = String(questionsData[i][12] || '').toLowerCase().trim();
      var status = String(questionsData[i][13] || 'active').toLowerCase().trim();
      
      if (status !== 'active') continue;
      if (!quizName) continue;
      if (!questionHeader && !questionText) continue;
      
      // Filter by supervisor region
      if (supervisorRegion !== "MASTER" && assignToGroup) {
        var normalizedGroup = assignToGroup.toLowerCase().trim();
        var normalizedRegion = supervisorRegion.toLowerCase().trim();
        if (normalizedGroup !== normalizedRegion &&
            !normalizedGroup.includes(normalizedRegion) &&
            !normalizedRegion.includes(normalizedGroup)) {
          continue;
        }
      }
      
      var qObj = {
        quiz: quizName,
        questionNumber: i, // Store Row Index (approximate Q#)
        questionText: questionText,
        questionHeader: questionHeader,
        videoUrl: videoUrl,
        correctAnswer: correctAnswer,
        totalAttempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        successRate: 0,
        wrongAnswers: {},
        studentGroups: {},
        mostCommonWrongAnswer: "",
        mostCommonWrongCount: 0
      };
      
      allQuestionsList.push(qObj);
      
      // Add to generic look-up map
      var key = quizName + "|" + questionText;
      if (!masterQuestionsMap[key]) {
        masterQuestionsMap[key] = [];
      }
      masterQuestionsMap[key].push(qObj); 
    }
    
    Logger.log("Loaded " + allQuestionsList.length + " questions from master list");
    
    // --- STEP 2: OVERLAY STATISTICS ---
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resultsSheet = ss.getSheetByName("Question Results");
    
    if (resultsSheet) {
      var resultsData = resultsSheet.getDataRange().getValues();
      if (resultsData.length > 1) {
        
        for (var i = 1; i < resultsData.length; i++) {
          var row = resultsData[i];
          if (!row[4] || !row[5]) continue;
          
          var studentGroup = String(row[3] || "Unknown").trim();
          
          // Filter stats by supervisor region
          if (supervisorRegion !== "MASTER") {
            var normalizedStudentGroup = studentGroup.toLowerCase().trim();
            var normalizedSupervisorRegion = supervisorRegion.toLowerCase().trim();
            if (normalizedStudentGroup !== normalizedSupervisorRegion &&
                !normalizedStudentGroup.includes(normalizedSupervisorRegion) &&
                !normalizedSupervisorRegion.includes(normalizedStudentGroup)) {
              continue;
            }
          }
          
          var quizName = String(row[4]);
          var resultQNum = parseInt(row[5]); // The Question Number from the form submission
          var resultQText = String(row[6]);
          var studentAnswer = String(row[7]);
          var isCorrect = row[9] === true || String(row[9]).toLowerCase() === 'true';
          
          var key = quizName + "|" + resultQText;
          var candidates = masterQuestionsMap[key];
          
          if (candidates && candidates.length > 0) {
            var targetQuestion = null;
            
            if (candidates.length === 1) {
              // Unique text match - perfect
              targetQuestion = candidates[0];
            } else {
              // Ambiguous text match (e.g. empty text). Use Number to disambiguate.
              // Note: resultQNum typically matches the row index in non-randomized quizzes
              // We check if resultQNum matches 'questionNumber' (which we stored as row index)
              // Or we just accept that stats might be imprecise for duplicates if numbers don't align.
              
              // Try to find exact number match
              targetQuestion = candidates.find(function(c) { return c.questionNumber === resultQNum; });
              
              // Fallback: if no number match, perhaps just assign to same index in candidates?
              // Or just dump it on the first one?
              if (!targetQuestion) {
                 targetQuestion = candidates[0];
              }
            }
            
            if (targetQuestion) {
              targetQuestion.totalAttempts++;
              if (isCorrect) {
                targetQuestion.correctAttempts++;
              } else {
                targetQuestion.incorrectAttempts++;
                if (studentAnswer) {
                  if (!targetQuestion.wrongAnswers[studentAnswer]) {
                    targetQuestion.wrongAnswers[studentAnswer] = 0;
                  }
                  targetQuestion.wrongAnswers[studentAnswer]++;
                }
              }
              
              if (!targetQuestion.studentGroups[studentGroup]) {
                targetQuestion.studentGroups[studentGroup] = { total: 0, correct: 0 };
              }
              targetQuestion.studentGroups[studentGroup].total++;
              if (isCorrect) {
                 targetQuestion.studentGroups[studentGroup].correct++;
              }
            }
          }
        }
      }
    }
    
    // --- STEP 3: CALCULATE RATES & FORMAT ---
    // We already have the list in 'allQuestionsList', no need to flatten map
    var result = allQuestionsList;
    
    for (var i = 0; i < result.length; i++) {
        var stat = result[i];
        
        if (stat.totalAttempts > 0) {
            stat.successRate = Math.round((stat.correctAttempts / stat.totalAttempts) * 100);
            
            var maxCount = 0;
            var mostCommonWrong = "";
            for (var answer in stat.wrongAnswers) {
                if (stat.wrongAnswers[answer] > maxCount) {
                    maxCount = stat.wrongAnswers[answer];
                    mostCommonWrong = answer;
                }
            }
            stat.mostCommonWrongAnswer = mostCommonWrong;
            stat.mostCommonWrongCount = maxCount;
        } else {
            stat.successRate = 0;
            stat.mostCommonWrongAnswer = "No attempts yet";
            stat.mostCommonWrongCount = 0;
        }
    }
    
    result.sort(function(a, b) {
      if (a.quiz !== b.quiz) return a.quiz.localeCompare(b.quiz);
      return a.questionNumber - b.questionNumber;
    });
    
    Logger.log("Returning " + result.length + " question stats");
    return result;
    
  } catch (err) {
    Logger.log("ERROR in getQuestionStats: " + err.toString());
    Logger.log("Stack: " + err.stack);
    return [];
  }
}

// ===== ENRICH HELPER - NOW A PASS-THROUGH =====
// Data is now already enriched in getQuestionStats
function enrichQuestionStatsWithVideos(questionStats) {
  return questionStats;
}

// ===== GET CMI REPORTS =====
function getCMIReports(role, seasonKey) {
  var source = DATA_SOURCES[seasonKey];
  if (!source) {
    Logger.log("No data source found for season: " + seasonKey);
    return [];
  }

  var sheet;
  try {
    if (source.type === 'active') {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(source.tabName);
    } else {
      sheet = SpreadsheetApp.openById(source.id).getSheetByName(source.tabName);
    }
  } catch (e) {
    Logger.log("Error opening sheet: " + e.message);
    return [];
  }

  if (!sheet) {
    Logger.log("Sheet not found: " + source.tabName);
    return [];
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("No data in CMI Reports sheet");
    return [];
  }

  var headers = data[0].map(h => String(h).toLowerCase());
  var map = {
    refName: headers.findIndex(h => h.includes('referee') || h.includes('ref name')),
    gameDate: headers.findIndex(h => h.includes('date') && !h.includes('timestamp')),
    supervisor: headers.findIndex(h => h.includes('supervisor')),
    level: headers.findIndex(h => h.includes('level')),
    home: headers.findIndex(h => h.includes('home')),
    away: headers.findIndex(h => h.includes('away')),
    cmi: headers.findIndex(h => h.includes('type') || h.includes('cmi')),
    half: headers.findIndex(h => h.includes('half')),
    time: headers.findIndex(h => h.includes('remaining') || h.includes('time')),
    notes: headers.findIndex(h => h.includes('notes') && !h.includes('moderator')),
    moderatorNotes: headers.findIndex(h => h.includes('moderator')),
    video: headers.findIndex(h => h.includes('video') || h.includes('clip') || h.includes('link')),
    tags: headers.findIndex(h => h.includes('tag') && !h.includes('timestamp')),
    timestamp: headers.findIndex(h => h.includes('timestamp'))
  };

  if (map.supervisor === -1) {
    map.supervisor = 2;
  }

  Logger.log("Filtering CMI reports for role: " + role);
  Logger.log("Total rows to process: " + (data.length - 1));

  var cleanReports = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var rowSup = (map.supervisor > -1 && r[map.supervisor]) ? String(r[map.supervisor]).trim() : "";

    var shouldInclude = false;
    
    if (role === 'MASTER') {
      shouldInclude = true;
    } else if (rowSup === role) {
      shouldInclude = true;
    }

    if (shouldInclude) {
      cleanReports.push({
        refName: (map.refName > -1) ? r[map.refName] : "",
        gameDate: formatDate(r[map.gameDate]),
        supervisor: rowSup,
        level: (map.level > -1) ? r[map.level] : "",
        home: (map.home > -1) ? r[map.home] : "",
        away: (map.away > -1) ? r[map.away] : "",
        cmi: (map.cmi > -1) ? r[map.cmi] : "",
        half: (map.half > -1) ? r[map.half] : "",
        time: (map.time > -1) ? r[map.time] : "",
        notes: (map.notes > -1) ? r[map.notes] : "",
        moderatorNotes: (map.moderatorNotes > -1) ? r[map.moderatorNotes] : "",
        video: (map.video > -1) ? r[map.video] : "",
        tags: (map.tags > -1) ? String(r[map.tags]) : "",
        timestamp: (map.timestamp > -1) ? formatDate(r[map.timestamp]) : ""
      });
    }
  }
  
  Logger.log("Filtered CMI reports count: " + cleanReports.length);
  return cleanReports;
}

// ===== HELPER FUNCTION =====
function formatDate(dateVal) {
  if (!dateVal) return "";
  try {
    var d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return String(dateVal); }
}
