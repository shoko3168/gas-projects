"use strict"
var CW = (function() {
  function CW(option) {
    var params = {
      'token': null, 
      'is_notify': false, 
      'notify_room': ''
    };
    var i;
    for (i in option) {
      params[i] = option[i];
    }
    this.inquiry_header = params['inquiry_header'];
    this.isNotify = params.is_notify;
    this.notify_room = params['notify_room'];
    this.token = params['token'];
  }
  CW.prototype._acceptAllIncomingRequests = function() {
    var reqs = this._get('/incoming_requests');
    if (reqs) {
      for (var i = 0; i < reqs.length; i++) {
        var req = reqs[i];
        var ret = this._put('/incoming_requests/' + req['request_id']);
        // ret
        // {room_id=92709016, account_id=1697407, avatar_image_url=https://appdata.chatwork.com/avatar/945/945758.jpg, chatwork_id=hakaba, organization_id=827263, name=ハカバくん, organization_name=, department=}
      }
      return reqs;
    }
  }
  CW.prototype._sendRequest = function(params) {
    var url = 'https://api.chatwork.com/v2' + params.url;
    var options = {
      'method': params.method,
      'headers': {'X-ChatWorkToken': this.token},
      'payload': params.payload || {},
      'muteHttpExceptions' : false
  };
  var result = UrlFetchApp.fetch(url, options);
  if (result.getResponseCode() == 200) {
    var retObj = JSON.parse(result.getContentText());
    return retObj;
  }
  }
  CW.prototype._sendMessage = function(roomId, msg) {
    return this._post('/rooms/'+ roomId +'/messages', {'body': msg});
  }
  CW.prototype._get = function(url, data) {
    data = data || {};
    var params = [];
    for (var key in data) {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(get_data[key]));
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this._sendRequest({
      'method': 'get',
      'url': url
    });
  }
  CW.prototype._put = function(url, data) {
    return this._sendRequest({
      'method': 'put',
      'url': url,
      'payload': data
    });
  }
  CW.prototype._post = function(url, data) {
    return this._sendRequest({
      'method': 'post',
      'url': url,
      'payload': data
    });
  }
  CW.prototype.acceptFriends = function() {
    var ret = this._acceptAllIncomingRequests();
    // ret
    // [{account_id=1697407, avatar_image_url=https://appdata.chatwork.com/avatar/945/945758.jpg, chatwork_id=hakaba, organization_id=827263, name=ハカバくん, organization_name=, message=, department=, request_id=8516729}]
    if (this.isNotify && ret) {
      this._sendMessage(this.notify_room, '以下の申請を承認しました。\n' + JSON.stringify(ret));
    }
  }
  CW.prototype.testNotify = function(msg) {
    if (this.isNotify) {
      this._sendMessage(this.notify_room, msg);
    }
  }
  return CW;
})();
