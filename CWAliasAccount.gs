"use strict"
var CWAliasAccount = (function() {
  function CWAliasAccount(option) {
    var params = {
      'token': null, 
      'inquiry_header': '【返信可能MSG】問合元：', 
      'is_reply': true, 
      'reply_message': '上記発言を承りました。お待ちください。', 
      'api_base_url': 'https://api.chatwork.com/v2', 
      'base_url': 'https://www.chatwork.com', 
    };
    var i;
    for (i in option) {
      params[i] = option[i];
    }
    this.inquiry_header = params['inquiry_header'];
    if (!params['token']) {
      throw new Error("'token' is required.");
    }
    if (!params['target_room']) {
      throw new Error("'target_room' is required.");
    }
    this.base_url = params['base_url'];
    this.api_base_url = params['api_base_url'];
    this.headers  = {'X-ChatWorkToken': params['token']};
    this.adminRoom = params['target_room'];
    this.isReply = params['is_reply'];
    this.replyMessage = params['reply_message'];
    if (params['log_sheet_url']) {
      var logBook = SpreadsheetApp.openByUrl(params['log_sheet_url']);
      this.logBookUrl = params['log_sheet_url'];
      this.logSheet = logBook.getSheetByName('logs');
      if (!this.logSheet) {
        this.logSheet = logBook.insertSheet('logs');
        this.logSheet.appendRow(['日時', 'type', '発言者', 'メッセージ']);
      }
      this.msgSheet = logBook.getSheetByName('msgs');
      if (!this.msgSheet) {
        this.msgSheet = logBook.insertSheet('msgs');
        this.msgSheet.appendRow(['日時', 'type', 'URL', '対応者', '宛先', 'メッセージ']);
      }
    }
    if (params['my_id'] && params['my_room_id']) {
      this.my_id = params['my_id'];
      this.my_room_id = params['my_room_id'];
    } else {
      var info = this._getMe();
      this.my_id = '' + info['account_id'];
      this.my_room_id = info['room_id'];
    }
  }
  CWAliasAccount.prototype._getMe = function() {
    return this._get('/me');
  }
  CWAliasAccount.prototype._getMessage = function(roomId, msgId) {
    return this._get('/rooms/' + roomId + '/messages/' + msgId);
  }
  CWAliasAccount.prototype._getMessages = function(roomId, isForce) {
    if (isForce) {
      return this._get('/rooms/' + roomId + '/messages?force=1');
    } else {
      return this._get('/rooms/' + roomId + '/messages');
    }
  }
  CWAliasAccount.prototype._sendRequest = function(params) {
    var url = this.api_base_url + params.url;
    var options = {
      'method': params.method,
      'headers': this.headers,
      'payload': (params.payload || {}),
      'muteHttpExceptions' : false
    };
    var result = UrlFetchApp.fetch(url, options);
    if (result.getResponseCode() == 200) {
      var retObj = JSON.parse(result.getContentText());
      return retObj;
    }
  }
  CWAliasAccount.prototype._sendMessage = function(roomId, msg) {
    return this._post('/rooms/'+ roomId +'/messages', {'body': msg});
  }
  CWAliasAccount.prototype._get = function(url, data) {
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
  CWAliasAccount.prototype._post = function(url, data) {
    return this._sendRequest({
      'method': 'post',
      'url': url,
      'payload': data
    });
  }
  CWAliasAccount.prototype.check = function() {
    
  }
  CWAliasAccount.prototype._getResponseInfo = function(userInfo) {
    var rx = new RegExp('to=([0-9]*)-([0-9]*)');
    var arr = rx.exec(userInfo);
    if (!arr || arr.length < 3) {
      return null;
    }
    var targetRoomId = arr[1];
    var targetMsgId = arr[2];
    // 返信元のメッセージを取得
    var orgMsg = this._getMessage(targetRoomId, targetMsgId);
    var bodyArray = orgMsg.body.split('\n');
    var rx2 = new RegExp(this.inquiry_header + '([0-9]*):([0-9]*):(.*)');
    var arr2 = rx2.exec(bodyArray[0]);
    if (!arr2 || arr2.length < 4) {
      return null;
    }
    var orgRoomId = arr2[1];
    var orgUserId = arr2[2];
    var orgUserName = arr2[3];
    return {
      'orgRoomId': orgRoomId
      , 'orgUserId': orgUserId
      , 'orgUserName': orgUserName
    };
  }
  CWAliasAccount.prototype._getRooms = function(params) {
    return this._get('/rooms');
  };
  CWAliasAccount.prototype.checkChat = function() {
    var rooms = this._getRooms();
    var messageQueue = [];
    for (var roomIdx in rooms) {
      var room = rooms[roomIdx];
      try {
        if (room['room_id'] == this.my_room_id) {// マイチャット
          continue;
        }
        if (room['room_id'] == this.adminRoom) {// 質問受付部屋
          this.checkResponse(room, messageQueue);
          continue;
        }
        if (room.unread_num > 0) {
          var cnt = 0;
          var msgs = this._getMessages(room.room_id);
          if (msgs) {
            for (var msgIdx = msgs.length - 1; msgIdx >= 0; msgIdx--) {
              if (cnt >= room.unread_num) {
                break;
              }
              var msg = msgs[msgIdx];
              // 自分の発言をskip
              if (msg.account['account_id'] == this.my_id) {
                continue;
              }
              var t = msg.send_time;
              t *= 1000;
              var sendTime = Utilities.formatDate(new Date(t), 'JST', 'yyyy-MM-dd HH:mm:ss');
              if (this.isReply) {
                var slackMsg = '';
                slackMsg += this.base_url + '/#!rid' + room.room_id + '-' + msg.message_id + '\n';
                slackMsg += this.replyMessage + '\n';
                slackMsg += ' [' + sendTime + ']\n';
                messageQueue.push([room.room_id, slackMsg]);
              }
              if (this.msgSheet) {
                this.msgSheet.appendRow([sendTime, 'receive', this.base_url + '/#!rid' + room.room_id + '-' + msg.message_id, msg.account.name + '(' + msg.account.account_id + ')', msg.body]);
              }
              // 管理者グループに送信(Main)
              var adminMsg = this.inquiry_header + room['room_id'] + ':' + msg.account['account_id'] + ':' + msg.account['name'] + '\n';
              adminMsg += msg.body;
              messageQueue.push([this.adminRoom, adminMsg]);
              cnt++;
            }
          }
        }
      } catch (e) {
        Logger.log(e);
        if (this.logSheet) {
          this.logSheet.appendRow([new Date(), 'error', e]);
          this.logSheet.appendRow([new Date(), 'errorMsg', e.message]);
        }
        var errMsg = room['name'] + '( ' + this.base_url + '/#!rid' + room['room_id'] + ' )の確認中に何かのエラーが起きました。ログをご確認ください。';
        if (this.logSheet) {
          errMsg += this.logBookUrl;
        }
        messageQueue.push([this.adminRoom, errMsg]);
      }
    }
    if (messageQueue.length > 0) {
      for (var i = messageQueue.length - 1; i >= 0; i--) {
        if (this.logSheet) {
          this.logSheet.appendRow([new Date(), 'msg', messageQueue[i][0], messageQueue[i][1]]);
        }
        // 本人に送信
        this._sendMessage(messageQueue[i][0], messageQueue[i][1]);
      }
    }
  }
  CWAliasAccount.prototype.checkResponse = function(room, messageQueue) {
    if (room.unread_num > 0) {
      var responseCache = {};
      var cnt = 0;
      var msgs = this._getMessages(room.room_id);
      if (msgs) {
        for (var msgIdx = (msgs.length - 1); msgIdx >= 0; msgIdx--) {
          if (cnt > room.unread_num) {
            break;
          }
          cnt++;
          var msg = msgs[msgIdx];
          if (!msg || !msg.account) {
            continue;
          }
          // 自分の発言をskip
          if (msg.account['account_id'] == this.my_id) {
            continue;
          }
          var msgTexts = msg.body.split('\n');
          var userInfo = msgTexts.shift();
          var t = msg.send_time;
          t *= 1000;
          var sendTime = Utilities.formatDate(new Date(t), 'JST', 'yyyy-MM-dd HH:mm:ss');
          var slackMsg = msgTexts.join('\n');;
          // userInfoから取得
          var resInfo = responseCache[userInfo];
          if (!resInfo) {
            resInfo = this._getResponseInfo(userInfo);
            responseCache[userInfo] = resInfo;
          }
          if (!resInfo) {
            continue;
          }
          var orgRoomId = resInfo['orgRoomId'];
          var inquiryRoomId = orgRoomId;
          var orgUserId = resInfo['orgUserId'];
          var orgUserName = resInfo['orgUserName'];
          slackMsg = '[To:' + orgUserId + '] ' + orgUserName + 'さん\n' + slackMsg;
          messageQueue.push([inquiryRoomId, slackMsg]);
          if (this.msgSheet) {
            this.msgSheet.appendRow([sendTime, 'reply', this.base_url + '/#!rid' + room.room_id + '-' + msg.message_id, msg.account.name + '(' + msg.account.account_id + ')', orgUserName + '(' + orgUserId + ')', msg.body]);
          }
          // 管理者グループに送信
          var adminMsg = '';
          adminMsg += this.base_url + '/#!rid' + room.room_id + '-' + msg.message_id + '\n';
          adminMsg += 'この返信を' + orgUserName + 'さんへ送信しました。';
          messageQueue.push([this.adminRoom, adminMsg]);
        }
      }
    }
  }
  return CWAliasAccount;
})();
function checkChat(params){
  var cw = new CWAliasAccount(params);
  return cw.checkChat();
}
function test() {
  return checkChat({
    'token': '757f5b300e389c9e103c6d07b60520f8', 
    'log_sheet_url': 'https://docs.google.com/spreadsheets/d/1DMFcCfo0feri1GF28_lurqB6Gl2UHFKO9k1Frhmv2z4/edit#gid=0', 
    'target_room': '92747455', 
    'is_reply': true,
    'inquiry_header': '!!!!【返信可能MSG】!!!!問合元：', 
    'reply_message': '＝上記発言を承りました＝', 
    'api_base_url': 'https://api.chatwork.com/v2', 
    'base_url': 'https://www.chatwork.com', 
  });
}
