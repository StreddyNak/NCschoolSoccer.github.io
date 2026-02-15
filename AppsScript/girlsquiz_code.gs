// 1. TRAFFIC CONTROLLER
function doGet(e) {
  // ✅ FIX: Add safety check for undefined parameter
  if (!e || !e.parameter) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "No parameters provided. Use: ?action=getQuizData&email=yourEmail"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = e.parameter.action;
  var email = e.parameter.email;

  // Fetch Questions (Now requires Email)
  if (action === 'getQuizData') {
    return getQuizQuestions(email);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ready", 
    message: "Quiz Backend Online"
  })).setMimeType(ContentService.MimeType.JSON);
}

// 2. HANDLE QUIZ SUBMISSIONS (Standard)
function doPost(e) {
  try {
    // ✅ FIX: Add safety check
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No data provided in POST request"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    // ⭐ NEW: VALIDATE QUIZ STATUS - Check if quiz is still accepting responses
    var quizStatusInfo = getQuizStatus(data.quizName);
    if (quizStatusInfo.status === 'closed') {
      Logger.log("REJECTED: Quiz '" + data.quizName + "' is closed");
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "This quiz is no longer accepting responses. Your answers were not saved."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Look up student's group from Roster
    var studentGroup = "Unknown";
    var rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Roster");
    if (rosterSheet) {
      var rData = rosterSheet.getDataRange().getValues();
      var submitterEmail = String(data.email).toLowerCase().trim();
      for (var i = 1; i < rData.length; i++) {
        if (String(rData[i][0]).toLowerCase().trim() === submitterEmail) {
          studentGroup = String(rData[i][3] || "Unknown").trim();
          break;
        }
      }
    }
    
    var targetTabName = data.quizName + " Results";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetTabName);
    
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Quiz Results");
    }

    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(targetTabName);
        sheet.appendRow(["Timestamp", "First Name", "Last Name", "Email", "Quiz Name", "Score", "Percentage", "Group"]);
        
        // ✅ FIX: Force Score column (F, column 6) to be TEXT format
        var lastCol = sheet.getLastColumn();
        sheet.getRange(1, 6, sheet.getMaxRows(), 1).setNumberFormat('@STRING@');
        Logger.log("Created new sheet with Score column formatted as text");
    }
    
    // Check if Group column exists, add if not
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes("Group")) {
      sheet.getRange(1, 8).setValue("Group");
    }
    
    // ✅ FIX: Ensure Score column is text format BEFORE appending data
    sheet.getRange(2, 6, sheet.getMaxRows(), 1).setNumberFormat('@STRING@');
    
    // Append the row
    sheet.appendRow([
      new Date(), data.firstName, data.lastName, data.email, 
      data.quizName, data.score, data.percent, studentGroup
    ]);
    
    // ✅ FIX: Double-check the last row's score column is formatted as text
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 6).setNumberFormat('@STRING@');
    Logger.log("Saved score: " + data.score + " (formatted as text)");
    
    // NEW: Save question-level results if provided
    if (data.questionResults && data.questionResults.length > 0) {
      var questionSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Question Results");
      
      if (!questionSheet) {
        questionSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Question Results");
        questionSheet.appendRow(["Timestamp", "Email", "Name", "Group", "Quiz", "Q#", "Question", "Student Answer", "Correct Answer", "Is Correct"]);
      }
      
      var timestamp = new Date();
      var fullName = data.firstName + " " + data.lastName;
      
      for (var i = 0; i < data.questionResults.length; i++) {
        var qr = data.questionResults[i];
        questionSheet.appendRow([
          timestamp,
          data.email,
          fullName,
          studentGroup,
          data.quizName,
          qr.questionNumber,
          qr.questionText,
          qr.studentAnswer,
          qr.correctAnswer,
          qr.isCorrect
        ]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("ERROR in doPost: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ⭐ NEW: GET QUIZ STATUS AND DATES FROM COLUMNS M, N, O
function getQuizStatus(quizName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var questionsSheet = ss.getSheetByName("Quiz Questions");
    
    if (!questionsSheet) {
      Logger.log("WARNING: Quiz Questions sheet not found");
      return { status: 'active', startDate: '', endDate: '' };
    }
    
    var data = questionsSheet.getDataRange().getValues();
    
    // Find the first row for this quiz and check its status
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowQuizName = String(row[0]).trim(); // Column A
      
      if (rowQuizName === quizName) {
        var status = String(row[13]).toLowerCase().trim() || 'active'; // Column N - Status
        var startDate = formatDate(row[14]); // Column O - Start Date
        var endDate = formatDate(row[15]); // Column P - End Date
        
        Logger.log("Quiz '" + quizName + "' status: " + status);
        return { status: status, startDate: startDate, endDate: endDate };
      }
    }
    
    Logger.log("Quiz '" + quizName + "' not found - defaulting to active");
    return { status: 'active', startDate: '', endDate: '' };
    
  } catch (err) {
    Logger.log("ERROR checking quiz status: " + err.toString());
    return { status: 'active', startDate: '', endDate: '' };
  }
}

// 3. FETCH QUESTIONS, HIGH SCORES & ELIGIBILITY
function getQuizQuestions(userEmail) {
  var response = { user: null, quizzes: {}, scores: {}, eligibility: null, quizStatus: {} };
  
  if (!userEmail) {
    return jsonResponse({
      error: "Email is required. Please provide ?email=yourEmail"
    });
  }
  
  userEmail = userEmail.toLowerCase().trim();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allTabs = ss.getSheets(); 

  // --- A. CHECK ROSTER & GET ELIGIBILITY ---
  var rosterSheet = ss.getSheetByName("Roster");
  var userGroups = ["public"]; 
  var isMaster = false;
  
  if (rosterSheet) {
    var rData = rosterSheet.getDataRange().getValues();
    for (var i = 1; i < rData.length; i++) {
      if (String(rData[i][0]).toLowerCase().trim() === userEmail) {
        response.user = {
          firstName: rData[i][1],
          lastName: rData[i][2],
          group: rData[i][3] 
        };
        var rawUserGroups = String(rData[i][3]).toLowerCase();
        userGroups = rawUserGroups.split(",").map(function(item) { return item.trim(); });
        if (userGroups.includes("master")) isMaster = true;
        
        // ⭐ Get eligibility data from checkbox columns
        // Column G (index 6) = Attended 1 checkbox
        // Column J (index 9) = Attended 2 checkbox
        var attended1 = rData[i][6]; // Column G - checkbox returns TRUE/FALSE
        var attended2 = rData[i][9]; // Column J - checkbox returns TRUE/FALSE
        
        var scrimmagesAttended = 0;
        if (attended1 === true || attended1 === "TRUE") scrimmagesAttended++;
        if (attended2 === true || attended2 === "TRUE") scrimmagesAttended++;
        
        // Get scrimmage details for display
        var scrimmage1Name = String(rData[i][4] || "Scrimmage 1").trim(); // Column E
        var scrimmage1Date = rData[i][5]; // Column F
        var scrimmage2Name = String(rData[i][7] || "Scrimmage 2").trim(); // Column H
        var scrimmage2Date = rData[i][8]; // Column I
        
        // Format dates if they exist
        var date1Str = "";
        var date2Str = "";
        if (scrimmage1Date instanceof Date) {
          date1Str = (scrimmage1Date.getMonth() + 1) + "/" + scrimmage1Date.getDate() + "/" + scrimmage1Date.getFullYear();
        } else if (scrimmage1Date) {
          date1Str = String(scrimmage1Date);
        }
        if (scrimmage2Date instanceof Date) {
          date2Str = (scrimmage2Date.getMonth() + 1) + "/" + scrimmage2Date.getDate() + "/" + scrimmage2Date.getFullYear();
        } else if (scrimmage2Date) {
          date2Str = String(scrimmage2Date);
        }
        
        response.eligibility = {
          scrimmagesAttended: scrimmagesAttended,
          regularSeasonEligible: scrimmagesAttended >= 1,
          playoffEligible: scrimmagesAttended >= 2,
          scrimmages: [
            {
              name: scrimmage1Name,
              date: date1Str,
              attended: attended1 === true || attended1 === "TRUE"
            },
            {
              name: scrimmage2Name,
              date: date2Str,
              attended: attended2 === true || attended2 === "TRUE"
            }
          ]
        };
        
        break;
      }
    }
  }
  
  // ✅ FIX: If user not found in roster, return error
  if (!response.user) {
    return jsonResponse({
      error: "Email not found in roster. Please contact your supervisor."
    });
  }

  // --- B. FETCH QUESTIONS & RESULTS ---
  for (var t = 0; t < allTabs.length; t++) {
    var currentTab = allTabs[t];
    var tabName = currentTab.getName();
    var data = currentTab.getDataRange().getValues();

    // 1. PROCESS QUESTIONS
    if (tabName.includes("Questions")) {
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var qName = row[0];
        
        // ⭐ FIXED: Get quiz status, dates, and instructional video with CORRECT column indices
        var assignToGroup = String(row[12]).toLowerCase().trim(); // Column M - Assign to Group
        var quizStatus = String(row[13]).toLowerCase().trim() || 'active'; // Column N - Status
        var startDate = row[14]; // Column O - Start Date
        var endDate = row[15]; // Column P - End Date
        var instructionalVideo = String(row[16] || '').trim(); // Column Q - Instructional Video URL
        
        var rawTargetGroups = assignToGroup; // Use the correct column

        var isPublic = (!assignToGroup || assignToGroup === "");
        var quizAllowedGroups = rawTargetGroups.split(",").map(function(item) { return item.trim(); });
        var isAllowed = userGroups.some(function(uGroup) { return quizAllowedGroups.includes(uGroup); });

        // ⭐ NEW: Track status, dates, and video for each quiz (use first occurrence)
        // ONLY if user is allowed to see it
        if (qName && !response.quizStatus[qName] && (isPublic || isAllowed || isMaster)) {
          response.quizStatus[qName] = {
            status: quizStatus,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            instructionalVideo: instructionalVideo
          };
        }

        if (qName && (isPublic || isAllowed || isMaster) && quizStatus === 'active') {
  if (!response.quizzes[qName]) response.quizzes[qName] = [];
  var rawOptions = [row[4], row[5], row[6], row[7], row[8], row[9]]; // Columns E-J (indices 4-9)
  response.quizzes[qName].push({
    questionHeader: row[1],  // Column B
    question: row[2],        // Column C
    video: row[3],           // Column D
    options: rawOptions.filter(String),
    answer: row[10],         // Column K
    explanation: row[11]     // Column L
  });
}
      }
    }

    // 2. PROCESS RESULTS (Find High Scores) - ALWAYS INCLUDE SCORES REGARDLESS OF STATUS
    if (tabName.includes("Results")) {
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        
        if (!row[3] || !row[4]) continue;
        
        var rowEmail = String(row[3]).toLowerCase().trim();
        
        if (rowEmail === userEmail) {
          var qName = String(row[4]).trim();
          var rawScore = row[5];
          
          var fractionalScore = "";
          if (rawScore instanceof Date) {
            fractionalScore = (rawScore.getMonth() + 1) + "/" + rawScore.getDate();
            Logger.log("WARNING: Score stored as date for " + qName + ": " + rawScore);
          } else if (typeof rawScore === 'string') {
            fractionalScore = rawScore;
          } else {
            fractionalScore = String(rawScore);
          }
          
          var rawPercent = row[6];
          var percentVal = 0;
          if (typeof rawPercent === 'string') {
             percentVal = parseFloat(rawPercent.replace('%', '')) || 0;
          } else if (typeof rawPercent === 'number') {
             percentVal = rawPercent > 1 ? rawPercent : rawPercent * 100;
          }

          var currentBest = response.scores[qName];
          if (!currentBest || percentVal > currentBest.percent) {
            response.scores[qName] = {
              percent: percentVal,
              score: fractionalScore
            };
          }
        }
      }
    }
  }

  Logger.log("=== Quiz Data Response ===");
  Logger.log("User: " + response.user.firstName + " " + response.user.lastName);
  Logger.log("Active quizzes: " + Object.keys(response.quizzes).length);
  Logger.log("Quiz statuses: " + JSON.stringify(response.quizStatus));
  Logger.log("Scores: " + JSON.stringify(response.scores));
  
  return jsonResponse(response);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ⭐ NEW: Format date helper function
function formatDate(dateValue) {
  if (!dateValue) return "";
  
  if (dateValue instanceof Date) {
    var month = dateValue.getMonth() + 1;
    var day = dateValue.getDate();
    var year = dateValue.getFullYear();
    return month + "/" + day + "/" + year;
  } else if (typeof dateValue === 'string') {
    return dateValue;
  }
  
  return "";
}

// ===== UTILITY: FIX EXISTING SCORE COLUMNS =====
function fixAllScoreColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets();
  var fixed = 0;
  
  for (var i = 0; i < allSheets.length; i++) {
    var sheet = allSheets[i];
    var sheetName = sheet.getName();
    
    if (sheetName.indexOf("Results") !== -1) {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      var scoreColIndex = -1;
      for (var h = 0; h < headers.length; h++) {
        if (String(headers[h]).toLowerCase().indexOf('score') !== -1) {
          scoreColIndex = h + 1;
          break;
        }
      }
      
      if (scoreColIndex > 0) {
        sheet.getRange(1, scoreColIndex, sheet.getMaxRows(), 1).setNumberFormat('@STRING@');
        Logger.log("Fixed: " + sheetName + " - Score column set to text format");
        fixed++;
      }
    }
  }
  
  Logger.log("=== Fix Complete ===");
  Logger.log("Fixed " + fixed + " sheets");
  
  // ✅ FIX: Only show UI alert if UI is available
  try {
    SpreadsheetApp.getUi().alert("Fixed " + fixed + " sheets!\n\nScore columns are now formatted as text.");
  } catch (uiErr) {
    Logger.log("Fix completed but UI not available for alert: " + uiErr.toString());
  }
}
