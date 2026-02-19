// ID of the "NC HS Coaches" spreadsheet
const COACH_SHEET_ID = "1JN68hzT5KXn4j7pSXuIH8ST_acdtVWIpNRvMeDo7Ygc";
const ADMIN_EMAIL = "ncschoolsoccer@gmail.com"; // Admin email for notifications

// RUN THIS FUNCTION ONCE IN THE EDITOR TO AUTHORIZE EMAIL PERMISSIONS
function authorizeEmail() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Script Authorization", "Your script can now send emails.", {name: 'NC HS Soccer Portal'});
}

function doGet(e) {
  return handleGet(e);
}

// ... doPost and handleReviewSubmission remain same ...
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.type === 'review_submission') {
      return handleReviewSubmission(data);
    }

    if (data.type === 'clip_submission') {
      return handleClipSubmission(data);
    }

    if (data.type === 'register') {
      return handleRegistration(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGet(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'coachLogin') {
    return handleCoachLogin(params.email);
  }
  
  if (action === 'approve') {
    return handleApproval(params.email);
  }
  
  if (action === 'deny') {
    return handleDenial(params.email, params.reason);
  }

  if (action === 'getPastReviews') {
    return getPastReviews(params.email);
  }

  if (action === 'getPastClips') {
    return getPastClips(params.email);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ready", message: "Coach Portal Backend Online"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ── Review Submission ──
function handleReviewSubmission(data) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var level = data.level || "";
  var r = data.ratings || {};
  var coachName   = data.coachName   || data.coachEmail || "";
  var coachSchool = data.coachSchool || "";

  // Helper to extract a metric value from a section object
  function v(section, key) { return (r[section] && r[section][key] !== undefined && r[section][key] !== null) ? String(r[section][key]) : ""; }
  function vReason(section, key) { return v(section, key + "_reason"); }
  function vNotes(section) { return (r[section] && r[section]["_notes"]) ? String(r[section]["_notes"]) : ""; }

  var sheet;
  var row;

  if (level === "JV") {
    sheet = ss.getSheetByName("Reviews_JV");
    if (!sheet) {
      sheet = ss.insertSheet("Reviews_JV");
      sheet.appendRow([
        "Timestamp", "Coach Name", "Coach Email", "School", "Date", "Opponent", "Level",
        // Home Ref scores (6)
        "HR: Pre-Game Comm", "HR: Appearance", "HR: Fitness/Movement", "HR: Game Mgmt", "HR: In-Game Comm", "HR: Teamwork",
        // Home Ref low-rating reasons (6)
        "HR Reason: Pre-Game Comm", "HR Reason: Appearance", "HR Reason: Fitness", "HR Reason: Game Mgmt", "HR Reason: In-Game Comm", "HR Reason: Teamwork",
        "HR: Notes",
        // Away Ref scores (6)
        "AR: Pre-Game Comm", "AR: Appearance", "AR: Fitness/Movement", "AR: Game Mgmt", "AR: In-Game Comm", "AR: Teamwork",
        // Away Ref low-rating reasons (6)
        "AR Reason: Pre-Game Comm", "AR Reason: Appearance", "AR Reason: Fitness", "AR Reason: Game Mgmt", "AR Reason: In-Game Comm", "AR Reason: Teamwork",
        "AR: Notes",
        "Reviewed"
      ]);
    }
    row = [
      new Date(), coachName, data.coachEmail, coachSchool, data.date, data.opponent, level,
      v("jv_home_ref","pregame_comm"), v("jv_home_ref","appearance"), v("jv_home_ref","fitness"),
      v("jv_home_ref","game_mgmt"),    v("jv_home_ref","ingame_comm"), v("jv_home_ref","teamwork"),
      vReason("jv_home_ref","pregame_comm"), vReason("jv_home_ref","appearance"), vReason("jv_home_ref","fitness"),
      vReason("jv_home_ref","game_mgmt"),    vReason("jv_home_ref","ingame_comm"), vReason("jv_home_ref","teamwork"),
      vNotes("jv_home_ref"),
      v("jv_away_ref","pregame_comm"), v("jv_away_ref","appearance"), v("jv_away_ref","fitness"),
      v("jv_away_ref","game_mgmt"),    v("jv_away_ref","ingame_comm"), v("jv_away_ref","teamwork"),
      vReason("jv_away_ref","pregame_comm"), vReason("jv_away_ref","appearance"), vReason("jv_away_ref","fitness"),
      vReason("jv_away_ref","game_mgmt"),    vReason("jv_away_ref","ingame_comm"), vReason("jv_away_ref","teamwork"),
      vNotes("jv_away_ref"),
      false
    ];
  } else {
    // Varsity
    sheet = ss.getSheetByName("Reviews_Varsity");
    if (!sheet) {
      sheet = ss.insertSheet("Reviews_Varsity");
      sheet.appendRow([
        "Timestamp", "Coach Name", "Coach Email", "School", "Date", "Opponent", "Level",
        // Referee (6 scores + 6 reasons + notes)
        "REF: Pre-Game Comm", "REF: Appearance", "REF: Movement/Fitness", "REF: Teamwork", "REF: Game Mgmt", "REF: In-Game Comm",
        "REF Reason: Pre-Game Comm", "REF Reason: Appearance", "REF Reason: Movement", "REF Reason: Teamwork", "REF Reason: Game Mgmt", "REF Reason: In-Game Comm",
        "REF: Notes",
        // Home AR (5 scores + 5 reasons + notes)
        "Home AR: Appearance", "Home AR: Fitness", "Home AR: Positioning", "Home AR: Communication", "Home AR: Teamwork",
        "Home AR Reason: Appearance", "Home AR Reason: Fitness", "Home AR Reason: Positioning", "Home AR Reason: Communication", "Home AR Reason: Teamwork",
        "Home AR: Notes",
        // Away AR (5 scores + 5 reasons + notes)
        "Away AR: Appearance", "Away AR: Fitness", "Away AR: Positioning", "Away AR: Communication", "Away AR: Teamwork",
        "Away AR Reason: Appearance", "Away AR Reason: Fitness", "Away AR Reason: Positioning", "Away AR Reason: Communication", "Away AR Reason: Teamwork",
        "Away AR: Notes",
        "Reviewed"
      ]);
    }
    row = [
      new Date(), coachName, data.coachEmail, coachSchool, data.date, data.opponent, level,
      v("v_ref","pregame_comm"), v("v_ref","appearance"), v("v_ref","movement"),
      v("v_ref","teamwork"),      v("v_ref","game_mgmt"),  v("v_ref","ingame_comm"),
      vReason("v_ref","pregame_comm"), vReason("v_ref","appearance"), vReason("v_ref","movement"),
      vReason("v_ref","teamwork"),     vReason("v_ref","game_mgmt"),  vReason("v_ref","ingame_comm"),
      vNotes("v_ref"),
      v("v_home_ar","appearance"), v("v_home_ar","fitness"), v("v_home_ar","positioning"),
      v("v_home_ar","communication"), v("v_home_ar","teamwork"),
      vReason("v_home_ar","appearance"), vReason("v_home_ar","fitness"), vReason("v_home_ar","positioning"),
      vReason("v_home_ar","communication"), vReason("v_home_ar","teamwork"),
      vNotes("v_home_ar"),
      v("v_away_ar","appearance"), v("v_away_ar","fitness"), v("v_away_ar","positioning"),
      v("v_away_ar","communication"), v("v_away_ar","teamwork"),
      vReason("v_away_ar","appearance"), vReason("v_away_ar","fitness"), vReason("v_away_ar","positioning"),
      vReason("v_away_ar","communication"), vReason("v_away_ar","teamwork"),
      vNotes("v_away_ar"),
      false
    ];
  }

  sheet.appendRow(row);

  // ── Email Admin with full details ──
  function sectionBlock(title, section, metrics) {
    var lines = title + "\n" + "─".repeat(title.length) + "\n";
    metrics.forEach(function(m) {
      var val = (r[section] && r[section][m.key] !== undefined && r[section][m.key] !== null) ? String(r[section][m.key]) : "—";
      lines += "  " + m.label + ": " + val;
      // Append low-rating reason inline if present
      var reason = r[section] && r[section][m.key + "_reason"];
      if (reason) lines += "  ← " + reason;
      lines += "\n";
    });
    var notes = r[section] && r[section]["_notes"];
    if (notes) lines += "  Notes: " + notes + "\n";
    return lines;
  }

  var JV_METRICS  = [{key:"pregame_comm",label:"Pre-Game Communication"},{key:"appearance",label:"Appearance"},{key:"fitness",label:"Fitness/Movement"},{key:"game_mgmt",label:"Game Management"},{key:"ingame_comm",label:"In-Game Communication"},{key:"teamwork",label:"Teamwork"}];
  var V_REF_M     = [{key:"pregame_comm",label:"Pre-Game Communication"},{key:"appearance",label:"Appearance"},{key:"movement",label:"Movement/Fitness"},{key:"teamwork",label:"Teamwork"},{key:"game_mgmt",label:"Game Management"},{key:"ingame_comm",label:"In-Game Communication"}];
  var AR_M        = [{key:"appearance",label:"Appearance"},{key:"fitness",label:"Fitness"},{key:"positioning",label:"Positioning"},{key:"communication",label:"Communication"},{key:"teamwork",label:"Teamwork"}];

  var sheetUrl = "https://docs.google.com/spreadsheets/d/" + COACH_SHEET_ID + "/edit";
  var tabName  = level === "JV" ? "Reviews_JV" : "Reviews_Varsity";

  var body = "New Performance Review Submitted\n" +
             "=====================================\n" +
             "Coach Name:   " + coachName + "\n" +
             "Coach Email:  " + data.coachEmail + "\n" +
             "School:       " + coachSchool + "\n" +
             "Date:         " + data.date + "\n" +
             "Opponent:     " + data.opponent + "\n" +
             "Level:        " + level + "\n\n";

  if (level === "JV") {
    body += sectionBlock("HOME SIDE REFEREE", "jv_home_ref", JV_METRICS) + "\n";
    body += sectionBlock("AWAY SIDE REFEREE", "jv_away_ref", JV_METRICS);
  } else {
    body += sectionBlock("REFEREE", "v_ref", V_REF_M) + "\n";
    body += sectionBlock("HOME SIDE AR", "v_home_ar", AR_M) + "\n";
    body += sectionBlock("AWAY SIDE AR", "v_away_ar", AR_M);
  }

  body += "\n\n— Open in Google Sheets —\n" + sheetUrl + "#gid=" + tabName + "\n";

  MailApp.sendEmail(ADMIN_EMAIL, "New Performance Review — " + level + " vs " + data.opponent + " (" + coachName + ")", body, {name: 'NC HS Soccer Portal'});

  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}

function handleClipSubmission(data) {
  try {
    var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
    var sheet = ss.getSheetByName("Clip Discussions");
    var coachName   = data.coachName   || data.coachEmail || "";
    var coachSchool = data.coachSchool || "";

    if (!sheet) {
      sheet = ss.insertSheet("Clip Discussions");
      sheet.appendRow(["Timestamp", "Coach Name", "Coach Email", "School", "Game Date", "Opponent", "Level", "Clip Location", "Notes", "Status", "Admin Notes"]);
    }

    sheet.appendRow([
      new Date(),
      coachName,
      data.coachEmail || "",
      coachSchool,
      data.date || "",
      data.opponent || "",
      data.level || "",
      data.clipLocation || "",
      data.notes || "",
      "Submitted",
      ""
    ]);

    var sheetUrl = "https://docs.google.com/spreadsheets/d/" + COACH_SHEET_ID + "/edit#gid=Clip%20Discussions";

    // Email Admin
    var subject = "New Clip Discussion — " + (data.level || "") + " vs " + (data.opponent || "") + " (" + coachName + ")";
    var body = "New Clip Discussion Submitted\n" +
               "=====================================\n" +
               "Coach Name:   " + coachName + "\n" +
               "Coach Email:  " + (data.coachEmail || "Unknown") + "\n" +
               "School:       " + coachSchool + "\n" +
               "Date:         " + (data.date || "") + "\n" +
               "Opponent:     " + (data.opponent || "") + "\n" +
               "Level:        " + (data.level || "") + "\n\n" +
               "Clip Location:\n  " + (data.clipLocation || "Not provided") + "\n\n" +
               "Notes:\n  " + (data.notes || "None") + "\n\n" +
               "— Open in Google Sheets —\n" + sheetUrl + "\n";

    MailApp.sendEmail(ADMIN_EMAIL, subject, body, { name: 'NC HS Soccer Portal' });

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getPastReviews(email) {
  if (!email) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email required" })).setMimeType(ContentService.MimeType.JSON);

  email = email.toLowerCase().trim();
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var reviews = [];

  // Helper: read a sheet and map rows to review objects
  function readSheet(sheetName, level, mapper) {
    var s = ss.getSheetByName(sheetName);
    if (!s) return;
    var rows = s.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      // Check Coach Email at index 2 (Col C)
      if (String(rows[i][2] || "").toLowerCase().trim() === email) {
        reviews.push(mapper(rows[i], level));
      }
    }
  }

  readSheet("Reviews_JV", "JV", function(d) {
    return {
      date: d[4], opponent: d[5], level: "JV",
      reviewed: d[33] === true || String(d[33]).toLowerCase() === 'true',
      ratings: {
        jv_home_ref: { pregame_comm: d[7],  appearance: d[8],  fitness: d[9],  game_mgmt: d[10],  ingame_comm: d[11],  teamwork: d[12] },
        jv_away_ref: { pregame_comm: d[20], appearance: d[21], fitness: d[22], game_mgmt: d[23], ingame_comm: d[24], teamwork: d[25] }
      }
    };
  });

  readSheet("Reviews_Varsity", "Varsity", function(d) {
    return {
      date: d[4], opponent: d[5], level: "Varsity",
      reviewed: d[42] === true || String(d[42]).toLowerCase() === 'true',
      ratings: {
        v_ref:     { pregame_comm: d[7],  appearance: d[8],  movement: d[9],    teamwork: d[10],    game_mgmt: d[11],    ingame_comm: d[12] },
        v_home_ar: { appearance: d[20],   fitness: d[21],    positioning: d[22], communication: d[23], teamwork: d[24] },
        v_away_ar: { appearance: d[31],   fitness: d[32],    positioning: d[33], communication: d[34], teamwork: d[35] }
      }
    };
  });

  // Sort newest first by date
  reviews.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

  return ContentService.createTextOutput(JSON.stringify({ status: "success", reviews: reviews })).setMimeType(ContentService.MimeType.JSON);
}

function getPastClips(email) {
  if (!email) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email required" })).setMimeType(ContentService.MimeType.JSON);

  email = email.toLowerCase().trim();
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var sheet = ss.getSheetByName("Clip Discussions");

  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: "success", clips: [] })).setMimeType(ContentService.MimeType.JSON);

  var data = sheet.getDataRange().getValues();
  var clips = [];

  for (var i = 1; i < data.length; i++) {
    // Check Coach Email at index 2 (Col C)
    if (String(data[i][2] || "").toLowerCase().trim() === email) {
      clips.push({
        timestamp: data[i][0],
        date: data[i][4],
        opponent: data[i][5],
        level: data[i][6],
        clipLocation: data[i][7],
        notes: data[i][8],
        status: data[i][9] || "Submitted",
        adminNotes: data[i][10] || ""
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success", clips: clips })).setMimeType(ContentService.MimeType.JSON);
}


function handleRegistration(data) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var pendingSheet = ss.getSheetByName("Pending Requests");
  var coachSheet = ss.getSheetByName("Coaches");
  
  if (!pendingSheet) {
    pendingSheet = ss.insertSheet("Pending Requests");
    pendingSheet.appendRow([
      "First Name", "Last Name", "Email", "School", "Mascot", "Supervisor", 
      "Film", "Platform", 
      "Home Shirt", "Home Shorts", "Home Socks", "Home GK",
      "Away Shirt", "Away Shorts", "Away Socks", "Away GK",
      "Timestamp"
    ]);
  }
  
  var email = (data.email || "").toLowerCase().trim();
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email is required" })).setMimeType(ContentService.MimeType.JSON);
  }

  // Check if already active
  var coaches = coachSheet ? coachSheet.getDataRange().getValues() : [];
  for (var i = 1; i < coaches.length; i++) {
    if (String(coaches[i][2] || "").toLowerCase().trim() === email) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email already registered. Please login." })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Check if already pending
  var pending = pendingSheet.getDataRange().getValues();
  for (var i = 1; i < pending.length; i++) {
    if (String(pending[i][2] || "").toLowerCase().trim() === email) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Request already pending approval." })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Extract specific uniform parts if available
  // Expected format if knowUniforms=Yes: "Home: Red/Red/Red (GK: Yellow)"
  // But actually, client sends "Home: shirt/shorts/socks (GK: gk)" string.
  // We should ideally change client to send specific fields, but for now let's parse or just update client to send object.
  // UPDATE: Client sends simple strings currently. We need to update client to send structured data OR parse.
  // BETTER: Let's assume we update client in next step. For now, let's just make placeholders if we can't parse easily without client update.
  // WAIT: The user asked "headers are not correct... each column should correspond to each separate type of data".
  // So I need to explode the current "Home Uniform" string into 4 columns.
  
  // Actually, I can't easily parse "Home: Red/Red/Red (GK: Yellow)" reliably without regex.
  // I will update the code to expect the client to send the separate fields, 
  // BUT first I need to update the CLIENT (coach.html) to send them.
  // Since I can only edit one file at a time or I am in the backend file now, I will update backend to EXPECT separate fields.
  
  // Columns: First, Last, Email, School, Mascot, Supervisor, Film, Platform, H-Shirt, H-Shorts, H-Socks, H-GK, A-Shirt, A-Shorts, A-Socks, A-GK, Date
  pendingSheet.appendRow([
    data.firstName,
    data.lastName,
    email,
    data.school,
    "", // Mascot
    data.supervisor || "Unknown",
    data.film || "No",
    data.platform || "",
    data.homeShirt || "",
    data.homeShorts || "",
    data.homeSocks || "",
    data.homeGK || "",
    data.awayShirt || "",
    data.awayShorts || "",
    data.awaySocks || "",
    data.awayGK || "",
    new Date()
  ]);

  // Email Admin
  var scriptUrl = ScriptApp.getService().getUrl();
  var approveLink = scriptUrl + "?action=approve&email=" + encodeURIComponent(email);
  var denyLink = scriptUrl + "?action=deny&email=" + encodeURIComponent(email);
  
  var subject = "New Coach Access Request: " + data.firstName + " " + data.lastName;
  var body = "New request from:\n\n" +
             "Name: " + data.firstName + " " + data.lastName + "\n" +
             "Email: " + email + "\n" +
             "School: " + data.school + "\n" +
             "Supervisor: " + (data.supervisor || "None") + "\n" +
             "Filming: " + (data.film || "No") + "\n" +
             "Platform: " + (data.platform || "N/A") + "\n" +
             "Home Uniform: " + (data.homeUniform || "N/A") + "\n" +
             "Away Uniform: " + (data.awayUniform || "N/A") + "\n\n" +
             "Approve: " + approveLink + "\n" +
             "Deny: " + denyLink;
             
  MailApp.sendEmail(ADMIN_EMAIL, subject, body, {name: 'NC HS Soccer Portal'});

  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}

function handleApproval(email) {
  var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
  var pendingSheet = ss.getSheetByName("Pending Requests");
  var coachSheet = ss.getSheetByName("Coaches");
  
  if (!pendingSheet) return HtmlService.createHtmlOutput("<h1>Error: 'Pending Requests' sheet not found.</h1>");

  if (!coachSheet) {
    coachSheet = ss.insertSheet("Coaches");
    coachSheet.appendRow([
      "First Name", "Last Name", "Email", "School", "Mascot", "Supervisor", 
      "Film", "Platform", 
      "Home Shirt", "Home Shorts", "Home Socks", "Home GK", 
      "Away Shirt", "Away Shorts", "Away Socks", "Away GK"
    ]);
  }
  
  var data = pendingSheet.getDataRange().getValues();
  var rowIndex = -1;
  var rowData = [];
  
  email = email.toLowerCase().trim();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || "").toLowerCase().trim() === email) {
      rowIndex = i + 1; // 1-based index
      rowData = data[i];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return HtmlService.createHtmlOutput("<h1>Request not found or already processed.</h1>");
  }
  
  // Move to Coaches
  // Pending: First(0), Last(1), Email(2), School(3), Mascot(4), Supervisor(5), Film(6), Platform(7), 
  //          H-Shirt(8), H-Shorts(9), H-Socks(10), H-GK(11), 
  //          A-Shirt(12), A-Shorts(13), A-Socks(14), A-GK(15), Timestamp(16)
  
  var supervisor = rowData[5] || ""; 
  var film = rowData[6] || "";
  var platform = rowData[7] || "";
  
  // Uniforms
  var hShirt = rowData[8] || "";
  var hShorts = rowData[9] || "";
  var hSocks = rowData[10] || "";
  var hGK = rowData[11] || "";
  
  var aShirt = rowData[12] || "";
  var aShorts = rowData[13] || "";
  var aSocks = rowData[14] || "";
  var aGK = rowData[15] || "";
  
  // Coaches Sheet: First, Last, Email, School, Mascot, Supervisor, Film, Platform, H-Shirt, H-Shorts, H-Socks, H-GK, A-Shirt, A-Shorts, A-Socks, A-GK
  coachSheet.appendRow([
    rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], supervisor, film, platform,
    hShirt, hShorts, hSocks, hGK,
    aShirt, aShorts, aSocks, aGK
  ]);
  
  // Remove from Pending
  pendingSheet.deleteRow(rowIndex);
  
  // Email Coach
  MailApp.sendEmail(email, "Coach Portal Access Approved", "Congratulations! Your access to the NC HS Coach Portal has been approved.\n\nYou can now login at: https://ncschoolsoccer.com/coach.html", {name: 'NC HS Soccer Portal'});
  
  return HtmlService.createHtmlOutput("<h1 style='color:green'>Coach Approved and Notified!</h1><p>" + email + "</p>");
}

function processDenial(email, reason) {
  try {
    var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
    var pendingSheet = ss.getSheetByName("Pending Requests");
    var deniedSheet = ss.getSheetByName("Denied Requests");
    
    if (!deniedSheet) {
      deniedSheet = ss.insertSheet("Denied Requests");
      deniedSheet.appendRow([
        "First Name", "Last Name", "Email", "School", "Mascot", "Supervisor", 
        "Film", "Platform", 
        "Home Shirt", "Home Shorts", "Home Socks", "Home GK", 
        "Away Shirt", "Away Shorts", "Away Socks", "Away GK",
        "Requested At", "Denied At", "Reason"
      ]);
    }
    
    if (!pendingSheet) return {status: "error", message: "'Pending Requests' sheet not found."};
    
    var data = pendingSheet.getDataRange().getValues();
    var rowIndex = -1;
    var rowData = [];
    
    email = email.toLowerCase().trim();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2] || "").toLowerCase().trim() === email) {
        rowIndex = i + 1;
        rowData = data[i]; 
        break;
      }
    }
    
    if (rowIndex === -1) {
      return {status: "error", message: "Request not found or already processed."};
    }

    // Archive to "Denied Requests"
    var outputRow = [];
    for(var j=0; j<=15; j++) {
        outputRow.push(rowData[j] || "");
    }
    outputRow.push(rowData[16] || ""); // Requested At
    outputRow.push(new Date()); // Denied At
    outputRow.push(reason); // Reason
    
    deniedSheet.appendRow(outputRow);
    pendingSheet.deleteRow(rowIndex);
    
    // Email
    try {
        var subject = "Coach Portal Access Denied";
        var body = "Your request to access the NC HS Coach Portal has been denied.\n\nReason: " + reason;
        MailApp.sendEmail(email, subject, body, {name: 'NC HS Soccer Portal'});
    } catch(e) {
        console.error("Failed to send denial email: " + e.toString());
    }
    
    return {status: "success", email: email, reason: reason};

  } catch (err) {
    return {status: "error", message: err.toString()};
  }
}

function handleDenial(email, reason) {
  // 1. If reason provided via GET (old way), verify and return HTML
  if (reason) {
     var result = processDenial(email, reason);
     if (result.status === 'success') {
         return HtmlService.createHtmlOutput("<h1 style='color:red'>Coach Request Denied.</h1><p>Email sent to: " + result.email + "</p><p>Reason: " + result.reason + "</p>");
     } else {
         return HtmlService.createHtmlOutput("<h1 style='color:red;'>Error</h1><p>" + result.message + "</p>");
     }
  }

  // 2. If no reason, show the Input Form (Client-Side Submission)
  var html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; text-align: center; border: 1px solid #ccc; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #c0392b; margin-top: 0;">Deny Access</h2>
      <p style="color: #666;">You are denying access for:<br><strong>${email}</strong></p>
      
      <div id="formContainer">
        <input type="hidden" id="denyEmail" value="${email}">
        <div style="margin-bottom: 20px; text-align: left;">
          <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #333;">Reason for Denial:</label>
          <textarea id="denyReason" rows="4" style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #ddd; font-family: inherit;" required placeholder="e.g. Incomplete information, Not a recognized school..."></textarea>
        </div>
        <button id="denyBtn" onclick="submitDenial()" style="background: #c0392b; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 4px; cursor: pointer; width: 100%;">Confirm Denial</button>
      </div>
      
      <div id="msg" style="margin-top:20px; color:#c0392b; font-weight:bold;"></div>
    </div>

    <script>
      function submitDenial() {
        var email = document.getElementById('denyEmail').value;
        var reason = document.getElementById('denyReason').value.trim();
        
        if(!reason) {
           alert("Please enter a reason.");
           return;
        }

        var btn = document.getElementById('denyBtn');
        var msg = document.getElementById('msg');
        
        btn.disabled = true;
        btn.innerText = "Processing...";
        msg.innerText = "";

        google.script.run
          .withSuccessHandler(function(res) {
             if (res.status === 'success') {
                document.body.innerHTML = "<div style='text-align:center; padding:50px; font-family:sans-serif;'><h1 style='color:red'>Request Denied</h1><p>Email verification sent to: " + res.email + "</p></div>";
             } else {
                msg.innerText = "Error: " + res.message;
                btn.disabled = false;
                btn.innerText = "Confirm Denial";
             }
          })
          .withFailureHandler(function(err) {
             msg.innerText = "System Error: " + err;
             btn.disabled = false;
             btn.innerText = "Confirm Denial";
          })
          .processDenial(email, reason);
      }
    </script>
  `;
  return HtmlService.createHtmlOutput(html).setTitle("Deny Access Reason");
}

function handleCoachLogin(email) {
  try {
    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Email is required' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    email = email.toLowerCase().trim();
    
    // Open Coaches Spreadsheet
    var ss = SpreadsheetApp.openById(COACH_SHEET_ID);
    var sheet = ss.getSheetByName("Coaches");
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Coaches tab not found' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    // Headers are seemingly fixed based on prompt: 
    // A=First Name, B=Last Name, C=Email, D=School, E=Mascot
    
    // We'll scan starting from row 1 (assuming row 0 is header)
    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][2] || "").toLowerCase().trim();
      
      if (rowEmail === email) {
        var firstName = String(data[i][0] || "").trim();
        var lastName = String(data[i][1] || "").trim();
        var school = String(data[i][3] || "").trim();
        var mascot = String(data[i][4] || "").trim();
        
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          firstName: firstName,
          lastName: lastName,
          school: school,
          mascot: mascot
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: 'Access denied: Email not found.' 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: 'Server error: ' + e.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
