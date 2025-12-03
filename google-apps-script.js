// Google Apps Script for Social Media Tracker
// Deploy this as a Web App with execute permissions for "Anyone"

function doGet(e) {
  const action = e.parameter.action;
  const sheetId = e.parameter.sheetId;
  
  if (action === 'readData' && sheetId) {
    return readSheetData(sheetId);
  }
  
  return ContentService.createTextOutput('Invalid request');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetId = data.sheetId;
    const sheetData = data.data;
    
    if (action === 'writeData' && sheetId && sheetData) {
      return writeSheetData(sheetId, sheetData);
    }
    
    return ContentService.createTextOutput('Invalid request');
  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

function readSheetData(sheetId) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeSheetData(sheetId, data) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    
    // Clear existing data
    sheet.clear();
    
    // Write new data
    if (data && data.length > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
