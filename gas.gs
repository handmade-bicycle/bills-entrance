const CHANNEL_ACCESS_TOKEN = 'YOURCHANNELTOKEN';
const LINE_REPLY_ENDPOINT = 'https://api.line.me/v2/bot/message/reply';
const recordSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('YOURSPREDSHEET');
const userA = 'xx'
const userB = 'yy'


function doPost(e){
  var event = JSON.parse(e.postData.contents).events[0];
  var replyToken= event.replyToken;
  
  if (event.type == 'message'){
    var m =''
    try{
      if(null != event.message.text.match('undo')){
        m = getLatestResultMessage()
        m = m + '\r\n＝＝＝＝＝＝＝＝＝＝＝＝\r\nこの↑記録を消去します。'
        m = m + '\r\n＝＝＝＝＝＝＝＝＝＝＝＝\r\n' 
        undo(event)
        m = m + getLatestResultMessage()
      }else if(null != event.message.text.match(`list`)){
        m = getList(event)
      }else{
        record(event)
        m = getLatestResultMessage()
      }
    }catch(error){
      m = error + '\r\n\r\n USAGE:\r\n"*****円 費目"：貸し借りを記録\r\n'
      m = m + '　　-「円」必須\r\n'
      m = m + '　　- ' + userA +'払いはプラス\r\n'
      m = m + '　　  ' + userB +'払いはマイナスで計上\r\n'
      m = m + '"undo"：最新結果を消去\r\n'
      m = m + '"list -**"：最新**件の記録を出力'
    }finally{
      reply(event.replyToken ,m)
    }
    
  }
  
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

function getList(event){
  const str = event.message.text
  var num = parseInt((str.split('-'))[1])
  if(num > 10){num = 10}
  const lastRow = recordSheet.getLastRow()
  var message = '記録日時 | 　費目　 |  金額  | 累計金額\r\n'
  message += '==========================\r\n'
  for (var i = num-1 ; i >= 0; i--){
    var row = lastRow - i
    const timestamp = recordSheet.getRange(row,1).getValue()
    const date = new Date(timestamp)
    const formattedDate = Utilities.formatDate(date,"JST", "MM/dd");
    const subject = recordSheet.getRange(row,2).getValue()
    const num = recordSheet.getRange(row,3).getValue()
    const subnum = recordSheet.getRange(row,4).getValue()
    var record = '' + formattedDate + ' | ' + subject + ' | ' + num + ' | ' + subnum + '\r\n'
    message += record
  }
  return message
}

function record(event){
  var lastRow = recordSheet.getLastRow()
  const str = event.message.text
  const num = parseInt(str)
  const subject = (str.split('円'))[1].trim()
  recordSheet.getRange(lastRow+1,1).setValue(event.timestamp)
  recordSheet.getRange(lastRow+1,2).setValue(subject)
  recordSheet.getRange(lastRow+1,3).setValue(num)
  recordSheet.getRange(lastRow+1,4).setValue(num + recordSheet.getRange(lastRow,4).getValue())

  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('log');
  logSheet.getRange(1,1).setValue(event)
  logSheet.getRange(1,2).setValue(str)
  logSheet.getRange(1,3).setValue(num)
  logSheet.getRange(1,4).setValue(subject)

  return recordSheet.getLastRow()
}

function undo(event){
  var lastRow = recordSheet.getLastRow()
  recordSheet.deleteRow(lastRow)
  return recordSheet.getLastRow()
}

function getLatestResultMessage(){

  const row = recordSheet.getLastRow()
  const timestamp = recordSheet.getRange(row,1).getValue()
  const date = new Date(timestamp)
  const formattedDate = Utilities.formatDate(date,"JST", "yyyy/MM/dd");
  const subject = recordSheet.getRange(row,2).getValue()
  const num = recordSheet.getRange(row,3).getValue()
  const subnum = recordSheet.getRange(row,4).getValue()

  var message = '最新の記録は' + formattedDate +'に記録された、'+ subject +'の' + num + '円です。\r\n累計金額は'+ subnum + '円です。'
  return message
}

function reply(replyToken,message){
  UrlFetchApp.fetch(LINE_REPLY_ENDPOINT, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': [{
        'type': 'text',
        'text': message,
      }],
    }),
  });
}
