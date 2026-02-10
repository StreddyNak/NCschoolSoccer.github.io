// ===== sync_quiz_results.gs CONFIGURATION =====
var FORM_RESPONSES_SHEET_ID = "1Amnscsmo07T03ZVPa_74IHcIy6KpYdvmIEZGrQ_wP1U";

// ===== MENU SETUP =====
function onOpen() {
  // ✅ FIX: Only create menu if UI is available
  try {
    var ui = SpreadsheetApp.getUi();
    
    // Check if automatic sync is enabled
    var triggers = ScriptApp.getProjectTriggers();
    var hasTimeTrigger = triggers.some(function(trigger) {
      return trigger.getHandlerFunction() === 'autoSync';
    });
    
    var menu = ui.createMenu('📊 Quiz Sync')
      .addItem('Sync Now (Manual)', 'manualSync')
      .addSeparator();
    
    if (hasTimeTrigger) {
      menu.addItem('✅ Auto-Sync is ON (Every 10 min)', 'showAutoSyncStatus')
          .addItem('❌ Disable Auto-Sync', 'disableAutoSync');
    } else {
      menu.addItem('⚙️ Setup Automatic Sync (Every 10 min)', 'setupAutoSync');
    }
    
    menu.addToUi();
  } catch (e) {
    // UI not available - script is running in a non-UI context (web app, trigger, etc.)
    // This is normal and expected - just skip menu creation
    Logger.log("Menu creation skipped - UI not available: " + e.toString());
  }
}

// ===== AUTOMATIC SYNC SETUP =====
function setupAutoSync() {
  try {
    // Delete any existing triggers first
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'autoSync') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    
    // Create new time-based trigger - runs every 10 minutes
    ScriptApp.newTrigger('autoSync')
      .timeBased()
      .everyMinutes(10)
      .create();
    
    Logger.log("Auto-sync trigger created successfully");
    
    // ✅ FIX: Only show UI alert if UI is available
    try {
      SpreadsheetApp.getUi().alert(
        "✅ Automatic Sync Enabled!\n\n" +
        "Quiz results will now automatically sync to the Admin Portal every 10 minutes.\n\n" +
        "You can still manually sync anytime using:\n" +
        "📊 Quiz Sync → Sync Now (Manual)"
      );
    } catch (uiErr) {
      Logger.log("Trigger created but UI not available for alert: " + uiErr.toString());
    }
    
    // Refresh menu
    onOpen();
    
  } catch (err) {
    Logger.log("Error setting up auto-sync: " + err.toString());
    try {
      SpreadsheetApp.getUi().alert("Error: " + err.toString());
    } catch (uiErr) {
      Logger.log("Could not show error alert - UI not available");
    }
  }
}

function disableAutoSync() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var deleted = 0;
    
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'autoSync') {
        ScriptApp.deleteTrigger(triggers[i]);
        deleted++;
      }
    }
    
    Logger.log("Deleted " + deleted + " auto-sync triggers");
    
    // ✅ FIX: Only show UI alert if UI is available
    try {
      SpreadsheetApp.getUi().alert(
        "❌ Automatic Sync Disabled\n\n" +
        "Quiz results will no longer automatically sync.\n\n" +
        "You can re-enable it anytime using:\n" +
        "📊 Quiz Sync → Setup Automatic Sync"
      );
    } catch (uiErr) {
      Logger.log("Trigger disabled but UI not available for alert: " + uiErr.toString());
    }
    
    // Refresh menu
    onOpen();
    
  } catch (err) {
    Logger.log("Error disabling auto-sync: " + err.toString());
    try {
      SpreadsheetApp.getUi().alert("Error: " + err.toString());
    } catch (uiErr) {
      Logger.log("Could not show error alert - UI not available");
    }
  }
}

function showAutoSyncStatus() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var syncTrigger = null;
    
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'autoSync') {
        syncTrigger = triggers[i];
        break;
      }
    }
    
    var message = "";
    if (syncTrigger) {
      message = "✅ Auto-Sync Status: ENABLED\n\n" +
        "Frequency: Every 10 minutes\n" +
        "Next sync: Within 10 minutes\n\n" +
        "To disable, use:\n" +
        "📊 Quiz Sync → Disable Auto-Sync";
    } else {
      message = "❌ Auto-Sync Status: DISABLED\n\n" +
        "To enable, use:\n" +
        "📊 Quiz Sync → Setup Automatic Sync";
    }
    
    Logger.log(message);
    
    // ✅ FIX: Only show UI alert if UI is available
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (uiErr) {
      Logger.log("Status logged but UI not available for alert: " + uiErr.toString());
    }
  } catch (err) {
    Logger.log("Error checking auto-sync status: " + err.toString());
  }
}

// ===== MANUAL SYNC (for testing or immediate sync) =====
function manualSync() {
  try {
    var result = syncQuizResultsToFormResponses();
    var response = JSON.parse(result.getContent());
    
    var message = "";
    if (response.status === "success") {
      message = "✅ Sync Complete!\n\n" +
        "Summary Results: " + response.copiedSummary + " new\n" +
        "Question Details: " + response.copiedQuestions + " new\n\n" +
        "These results are now visible in the Admin Portal.";
    } else {
      message = "❌ Sync failed: " + response.message;
    }
    
    Logger.log(message);
    
    // ✅ FIX: Only show UI alert if UI is available
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (uiErr) {
      Logger.log("Sync completed but UI not available for alert: " + uiErr.toString());
    }
  } catch (err) {
    Logger.log("Error in manualSync: " + err.toString());
    try {
      SpreadsheetApp.getUi().alert("❌ Error: " + err.toString());
    } catch (uiErr) {
      Logger.log("Could not show error alert - UI not available");
    }
  }
}

// ===== AUTO SYNC (triggered every 10 minutes) =====
function autoSync() {
  Logger.log("=== AUTO-SYNC STARTED ===");
  Logger.log("Time: " + new Date());
  
  try {
    var result = syncQuizResultsToFormResponses();
    var response = JSON.parse(result.getContent());
    
    if (response.status === "success") {
      Logger.log("✅ Auto-sync successful");
      Logger.log("Summary results copied: " + response.copiedSummary);
      Logger.log("Question details copied: " + response.copiedQuestions);
    } else {
      Logger.log("❌ Auto-sync failed: " + response.message);
    }
  } catch (err) {
    Logger.log("❌ Auto-sync error: " + err.toString());
  }
  
  Logger.log("=== AUTO-SYNC COMPLETED ===");
}

// ===== MAIN SYNC FUNCTION =====
function syncQuizResultsToFormResponses() {
  try {
    Logger.log("=== Starting Quiz Results Sync ===");
    
    // ✅ FIX: Add error handling for missing spreadsheet
    var sourceSheet;
    try {
      sourceSheet = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      throw new Error("Cannot access source spreadsheet: " + err.toString());
    }
    
    var allTabs = sourceSheet.getSheets();
    
    // Load Roster for student groups
    var rosterSheet = sourceSheet.getSheetByName("Roster");
    var studentGroups = {};
    
    if (rosterSheet) {
      var rosterData = rosterSheet.getDataRange().getValues();
      for (var r = 1; r < rosterData.length; r++) {
        var email = String(rosterData[r][0]).toLowerCase().trim();
        var group = String(rosterData[r][3] || "").trim();
        if (email) {
          studentGroups[email] = group || "Unknown";
        }
      }
      Logger.log("Loaded " + Object.keys(studentGroups).length + " students from Roster");
    }
    
    // ✅ FIX: Add error handling for target sheet access
    var targetSheet;
    try {
      targetSheet = SpreadsheetApp.openById(FORM_RESPONSES_SHEET_ID);
    } catch (err) {
      throw new Error("Cannot access target spreadsheet. Check FORM_RESPONSES_SHEET_ID: " + err.toString());
    }
    
    // ===== SYNC SUMMARY RESULTS =====
    var summaryTab = targetSheet.getSheetByName("Quiz Results");
    if (!summaryTab) {
      summaryTab = targetSheet.insertSheet("Quiz Results");
      summaryTab.appendRow(["Timestamp", "First Name", "Last Name", "Email", "Quiz Name", "Score", "Percentage", "Group"]);
      // ✅ FIX: Format Score column as text
      summaryTab.getRange(1, 6, summaryTab.getMaxRows(), 1).setNumberFormat('@STRING@');
    } else {
      var headers = summaryTab.getRange(1, 1, 1, summaryTab.getLastColumn()).getValues()[0];
      if (!headers.includes("Group")) {
        summaryTab.getRange(1, 8).setValue("Group");
      }
      // ✅ FIX: Ensure Score column stays formatted as text
      summaryTab.getRange(1, 6, summaryTab.getMaxRows(), 1).setNumberFormat('@STRING@');
    }
    
    var existingSummary = summaryTab.getDataRange().getValues();
    var existingKeys = {};
    for (var i = 1; i < existingSummary.length; i++) {
      var key = existingSummary[i][3] + "|" + existingSummary[i][4] + "|" + existingSummary[i][0];
      existingKeys[key] = true;
    }
    
    var copiedSummary = 0;
    
    // ===== SYNC QUESTION RESULTS =====
    var questionTab = targetSheet.getSheetByName("Question Results");
    if (!questionTab) {
      questionTab = targetSheet.insertSheet("Question Results");
      questionTab.appendRow(["Timestamp", "Email", "Name", "Group", "Quiz", "Q#", "Question", "Student Answer", "Correct Answer", "Is Correct"]);
    }
    
    var existingQuestions = questionTab.getDataRange().getValues();
    var existingQKeys = {};
    for (var i = 1; i < existingQuestions.length; i++) {
      var qKey = existingQuestions[i][1] + "|" + existingQuestions[i][4] + "|" + existingQuestions[i][5] + "|" + existingQuestions[i][0];
      existingQKeys[qKey] = true;
    }
    
    var copiedQuestions = 0;
    
    // ===== PROCESS ALL TABS =====
    for (var t = 0; t < allTabs.length; t++) {
      var tab = allTabs[t];
      var tabName = tab.getName();
      
      // SYNC SUMMARY RESULTS
      if (tabName.indexOf("Results") !== -1 && tabName !== "Question Results") {
        Logger.log("Processing: " + tabName);
        
        // ✅ FIX: Add error handling for empty sheets
        var data;
        try {
          data = tab.getDataRange().getValues();
        } catch (err) {
          Logger.log("Error reading " + tabName + ": " + err.toString());
          continue;
        }
        
        if (data.length < 2) continue;
        
        var headers = data[0];
        var hasCorrectHeaders = String(headers[0]).toLowerCase().indexOf('time') !== -1;
        if (!hasCorrectHeaders) continue;
        
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (!row[3] || !row[4]) continue;
          
          var key = row[3] + "|" + row[4] + "|" + row[0];
          if (existingKeys[key]) continue;
          
          var studentEmail = String(row[3]).toLowerCase().trim();
          var studentGroup = studentGroups[studentEmail] || "Unknown";
          
          var rawScore = row[5];
          var fixedScore = rawScore;
          
          // ✅ FIX: Handle scores that might be dates
          if (rawScore instanceof Date) {
            // If stored as date, try to recover the fractional score
            fixedScore = (rawScore.getMonth() + 1) + "/" + rawScore.getDate();
            Logger.log("WARNING: Score stored as date, converting: " + fixedScore);
          } else if (typeof rawScore === 'string') {
            fixedScore = rawScore;
          } else {
            fixedScore = String(rawScore);
          }
          
          var rawPercent = row[6];
          var fixedPercent = rawPercent;
          if (typeof rawPercent === 'number' && rawPercent < 1) {
            fixedPercent = Math.round(rawPercent * 100) + "%";
          } else if (typeof rawPercent === 'number') {
            fixedPercent = rawPercent + "%";
          }
          
          summaryTab.appendRow([
            row[0], row[1], row[2], row[3], row[4],
            fixedScore, fixedPercent, studentGroup
          ]);
          
          var lastRow = summaryTab.getLastRow();
          // ✅ FIX: Force the score cell to be text
          summaryTab.getRange(lastRow, 6).setNumberFormat('@STRING@');
          
          copiedSummary++;
        }
      }
      
      // SYNC QUESTION RESULTS
      if (tabName === "Question Results") {
        Logger.log("Processing: Question Results");
        
        var qData;
        try {
          qData = tab.getDataRange().getValues();
        } catch (err) {
          Logger.log("Error reading Question Results: " + err.toString());
          continue;
        }
        
        if (qData.length < 2) continue;
        
        for (var i = 1; i < qData.length; i++) {
          var qRow = qData[i];
          if (!qRow[1] || !qRow[4] || !qRow[5]) continue; // Email, Quiz, Q#
          
          var qKey = qRow[1] + "|" + qRow[4] + "|" + qRow[5] + "|" + qRow[0];
          if (existingQKeys[qKey]) continue;
          
          questionTab.appendRow(qRow);
          copiedQuestions++;
        }
      }
    }
    
    Logger.log("=== Sync Complete ===");
    Logger.log("Summary results copied: " + copiedSummary);
    Logger.log("Question details copied: " + copiedQuestions);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      copiedSummary: copiedSummary,
      copiedQuestions: copiedQuestions
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log("ERROR: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
