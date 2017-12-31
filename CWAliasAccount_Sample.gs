// Library project key
// 1Rpm-_kZprVA4BusiDxHnebHWR6wprUTarpnHvJaTH7BriMuCjKeiLl5A
function checkChat() {
  return CWAliasAccount.checkChat({
    'token': PropertiesService.getScriptProperties().getProperty('TOKEN'), 
    'log_sheet_url': 'https://docs.google.com/spreadsheets/d/***********/edit', 
    'target_room': '99999999', 
    'is_reply': true,
    'reply_message': '上記発言を承りました', 
    'inquiry_header': '【返信可能MSG】問合元：', 
    'api_base_url': 'https://api.chatwork.com/v2', 
    'base_url': 'https://www.chatwork.com', 
  });
}
