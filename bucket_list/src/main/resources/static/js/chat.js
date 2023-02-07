const accessToken = localStorage.getItem("accessToken");
const lsPayload = accessToken.split('.')[1];
const lsMemberId = JSON.parse(atob(lsPayload)).memberId;
const lsUserName = JSON.parse(atob(lsPayload)).userName;

//서버 웹소켓 연결
let socket = new SockJS('/ws');
let stompMessage, stompRoomList;

stompClient = Stomp.over(socket);

let header = {
    Authorization : "Bearer " + accessToken
}
let listHeader = {
    Authorization : "Bearer " + accessToken,
    id : "list"
};

let messageHeader = {
    Authorization : "Bearer " + accessToken,
    id : "message"
}

stompClient.connect(header,onConnected,onError);

function onConnected() {
    stompClient.subscribe('/sub/list/chat/room/'+lsMemberId, onRoomListReceived,listHeader);
}

//채팅방 리스트 받아오기
window.onload = function () {
    axios({
        method:"GET",
        url: '/chat',
    }).then((res)=>{
        let data = res.data.content;
        let html, i;
        for(i in data) {
            html +=
                `<div id="chat-list-box-${data[i].roomId}"class="list-group-item list-group-item-action d-flex gap-3 py-3 border-bottom rounded-3 shadow-sm chat-list-box" aria-current="true" onclick="showChatRoom(${data[i].roomId},'${data[i].roomName}')">
                    <!-- <img src="https://github.com/twbs.png" alt="twbs" width="32" height="32" class="rounded-circle flex-shrink-0"> -->
                    <div class="d-flex gap-2 w-100 justify-content-between ">
                        <div class="text-truncate">
                        <h4 id="chat-list-room-name-${data[i].roomId}" class="mb-0 text-truncate">${data[i].roomName}</h4>
                        <p class="d-block mb-0 opacity-75 text-truncate">${data[i].lastUserName}: ${data[i].lastMessage}</p>
                        </div>
                        <small class="opacity-50 text-nowrap">${getHoursMinTime(data[i].lastMessageTime)}</small>
                    </div>
                </div>`;
        }
        $('#chat-list-box-wrap').append(html.replace('undefined',''));
        console.log(data);
    }).catch(error=>{
        console.log(error);
        throw new Error(error);
    });
};

//시간 변환
function getHoursMinTime(time) {
    let date = new Date(time);
    let hours = ('0' + date.getHours()).slice(-2);
    let minutes = ('0' + date.getMinutes()).slice(-2);
    return hours+':'+minutes;
}

//채팅방 하나 클릭시 해당 채팅방 채팅내역 불러오기
function showChatRoom(roomId,roomName) {
    $(`#chat-message-box-wrap`).children().remove();

    let chatRoomName = `<h2 style="margin: 20px 0 10px 0" id="chat-room-name">${roomName}</h2>
                          <hr class="dropdown-divider" style="margin: 10px 0 30px 0">
                          <input type="hidden" name="roomId" value="${roomId}" id="chat-room-id">

`

    $('#chat-message-box-wrap').append(chatRoomName.replace('undefined',''));

    axios({
        method:"GET",
        url: '/chat/messages/'+roomId,
    }).then((res)=> {
        console.log(res);
        let data = res.data.result.content;
        let html, i, j;

        html += `<div id="chat-message-box-${roomId}">`

        for(i=data.length-1; i>0; i--) {
            if(data[i].message === '' || data[i].message === null) continue;
            if(data[i].userName === lsUserName) {
                html += `<div class="d-flex flex-column justify-content-end message-box-wrap">
                            <div class="d-flex flex-row align-items-end justify-content-end">
                            <small class="opacity-50 text-nowrap">${getHoursMinTime(data[i].createdAt)}</small>
                            <div class="message-box-mine">${data[i].message}</div>
                        </div>
                    </div>`;
            } else {
                html += `<div class="d-flex flex-column message-box-wrap">
                        <h6 class="message-username">${data[i].userName}</h6>
                        <div class="d-flex flex-row align-items-end">
                            <div class="message-box">${data[i].message}</div>
                            <small class="opacity-50 text-nowrap">${getHoursMinTime(data[i].createdAt)}</small>
                        </div>
                    </div>`;
            }
        }

        html += `</div>`;
        $('#chat-message-box-wrap').append(html.replace('undefined',''));
        $('#chat-message-box-wrap').scrollTop($('#chat-message-box-wrap')[0].scrollHeight);
    }).catch(error=>{
        console.log(error);
        throw new Error(error);
    });

    //해당 채팅방의 stomp 연결
    messageOnConnected(roomId);
}

//해당 리스트를 클릭해서 방으로 입장했을때
function messageOnConnected(roomId) {
    stompClient.unsubscribe('message');
    stompClient.subscribe('/sub/chat/room/'+roomId, onMessageReceived, messageHeader);

    stompClient.send("/pub/chat/enter",
        messageHeader,
        JSON.stringify({
            'roomId':roomId,
            'memberId':lsMemberId,
            'userName':lsUserName,
            'chatType':'JOIN'
        }));
}

//stomp에서 업데이트된 리스트를 받았을때
function onRoomListReceived(payload) {
    let data = JSON.parse(payload.body);
    let roomName = $(`#chat-list-room-name-${data.roomId}`).text();
    $(`#chat-list-box-${data.roomId}`).remove();

    console.log(data);
    let html;

    if(data.chatType === 'LIST') {
        html = `<div id="chat-list-box-${data.roomId}"class="list-group-item list-group-item-action d-flex gap-3 py-3 border-bottom rounded-3 shadow-sm chat-list-box" aria-current="true" onclick="showChatRoom(${data.roomId},'${data.roomName}')">
                    <!-- <img src="https://github.com/twbs.png" alt="twbs" width="32" height="32" class="rounded-circle flex-shrink-0"> -->
                    <div class="d-flex gap-2 w-100 justify-content-between ">
                        <div class="text-truncate">
                        <h4 id="chat-list-room-name-${data.roomId}" class="mb-0 text-truncate">${roomName}</h4>
                        <p class="d-block mb-0 opacity-75 text-truncate">${data.userName}: ${data.message}</p>
                        </div>
                        <small class="opacity-50 text-nowrap">${getHoursMinTime(data.lastModifiedAt)}</small>
                    </div>
                </div>`;
    }
    $('#chat-list-hr').after(html);
}

//stomp에서 메시지를 받았을때
function onMessageReceived(payload) {
    let message = JSON.parse(payload.body);
    let html;

    console.log(getHoursMinTime(message.lastModifiedAt));

    if(message.type === 'JOIN') {
        console.log("입장");
    } else if (message.type === 'LEAVE') {
        console.log("퇴장");
    } else if (message.type === 'LIST') {

    } else {
        if(message.userName === lsUserName) {
            html += `<div class="d-flex flex-column justify-content-end message-box-wrap">
                            <div class="d-flex flex-row align-items-end justify-content-end">
                            <small class="opacity-50 text-nowrap">${getHoursMinTime(message.lastModifiedAt)}</small>
                            <div class="message-box-mine">${message.message}</div>
                        </div>
                    </div>`;
        } else {
            html += `<div class="d-flex flex-column message-box-wrap">
                        <h6 class="message-username">${message.userName}</h6>
                        <div class="d-flex flex-row align-items-end">
                            <div class="message-box">${message.message}</div>
                            <small class="opacity-50 text-nowrap">${getHoursMinTime(message.lastModifiedAt)}</small>
                        </div>
                    </div>`;
        }

        $('#chat-message-box-wrap').append(html.replace('undefined',''));
        $('#chat-message-box-wrap').scrollTop($('#chat-message-box-wrap')[0].scrollHeight);
    }
}

function sendMessage() {
    let messageContent = $(`.text-area`).val();
    let roomId = $(`#chat-room-id`).val();
    if(messageContent && stompClient) {
        let chatMessage = {
            'roomId':roomId,
            'memberId':lsMemberId,
            'userName':lsUserName,
            'message': messageContent,
            chatType: 'CHAT'
        };
        stompClient.send("/pub/chat/sendMessage", messageHeader, JSON.stringify(chatMessage));

        $(`.text-area`).val('');
    }
}

function onError(error) {

}