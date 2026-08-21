import {
  htmlJsonToMap,
  calcAcwScV2,
  mustParseTime,
  sizeStrToInt64,
  removeNotes,
  removeJSComment,
  getJSFunctionByName,
} from "../src/backend/drivers/lanzou/help"

// Sample Lanzou file page HTML snippet with password
const samplePageWithPwd = `
<html>
<head><title>test.zip - 蓝奏云</title></head>
<body>
<div id="passwddiv"></div>
<script>
var ajaxdata = 'ajax_12345';
var skdkw = 'sign_abcde';
var sasign = 'dummy1';
var sasign = 'real_sasign_value';
var websignkey = 'key_999';
var file_id = '987654';

function down_p() {
    var pwd = document.getElementById('pwd').value;
    $.ajax({
        type : 'post',
        url : '/ajaxm.php?file=987654',
        data : { 'action':'downprocess', 'sign':skdkw, 'p':pwd, 'websignkey':websignkey, 'ves':1 },
        dataType : 'json',
        success: function(msg){}
    });
}
</script>
</body>
</html>
`

console.log("Testing down_p extraction...")
const fn = getJSFunctionByName(samplePageWithPwd, "down_p")
console.log("down_p function:", fn)

const params = htmlJsonToMap(fn, samplePageWithPwd)
console.log("Extracted params:", params)

if (params.action !== "downprocess") {
  console.error("FAIL: action is not downprocess, got:", params.action)
}
if (params.sign !== "sign_abcde") {
  console.error("FAIL: sign is not sign_abcde, got:", params.sign)
}
if (params.websignkey !== "key_999") {
  console.error("FAIL: websignkey is not key_999, got:", params.websignkey)
}
if (params.ves !== "1") {
  console.error("FAIL: ves is not 1, got:", params.ves)
}
