// Add Library
// 1OcZAwzfi3imm_FwpbTPAtDTi4HeNFBb5NNE04mh4SEtKynCY1kaWyg5K
function test() {
  var cw = new AcceptAllIncomingRequests.CW({'token': '***token***', 'is_notify': true, notify_room: '999999999'});
  cw.acceptFriends();
  cw.testNotify('test send message');
}
