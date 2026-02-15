// ===== COACH LOGIN HANDLER =====
// ID of the "NC HS Coaches" spreadsheet
const COACH_SHEET_ID = "1JN68hzT5KXn4j7pSXuIH8ST_acdtVWIpNRvMeDo7Ygc";

function doGet(e) {
  var params = e.parameter;
  var action = params.action;

  if (action === 'coachLogin') {
    return handleCoachLogin(params.email);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ready", message: "Coach Portal Backend Online"
  })).setMimeType(ContentService.MimeType.JSON);
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
