// const e = require("connect-flash");

$(document).ready(function(){

    $(".notification").on('click', function(){
        // alert($(this).attr("id"));
        //Sets Notif status to 0
        $.get("/updateNotif", {notification_id : $(this).attr("id")}, function(result){});
    });



    if(view == "sms_messages"){

        //INITIALIZE
        $.get("/employeeDetails", {employee_id : $(".active_chat").attr("id")}, function(result){
            $("#texter_name").text(result.first_name + " " + result.last_name + " +63" + result.phone_number);
            $("#texter_details").text(result.farm_name + ": " + result.position);
        });
        $("#msgHistory").empty();
        // alert($(".active_chat").attr("id"));
        $.get("/userConvos", {employee_id : $(".active_chat").attr("id")}, function(result){
            for(var i = 0 ; i < result.length; i++){
                //ADD TO #msgHistory
                if(result[i].origin == "inbound"){
                    //append
                    $("#msgHistory").append(' <div class="incoming_msg"> <div class="incoming_msg_img"> <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil"> </div> <div class="received_msg"> <div class="received_withd_msg"> <p>' + result[i].message +'</p> <span class="time_date">' + result[i].time + ' | ' + result[i].date + '</span></div> </div> </div>');
                }
                else if(result[i].origin == "outbound"){
                    $("#msgHistory").append(' <div class="outgoing_msg"> <div class="sent_msg"> <p>' + result[i].message +'</p> <span class="time_date">' + result[i].time + ' | ' + result[i].date + '</span> </div> </div> ');
                }
            }
    
        });

        //Scroll to botom
        $("#msgHistory").animate({scrollTop: $("#msgHistory").prop("scrollHeight")}, 1000)


        //ON SELECT OF NEW USER
        $(".chat_list").on("click", function(){
            changeConversation();
        });

        $("#send_btn").on("click", function(){
            if($("#text_message").val() == ""){
                alert("Enter your message");
            }
            else{
                $.get("/ajaxGetCurrentDate", {}, function(result){
                    var date = new Date();
                    var system_date = new Date(result);
                    //SET TIME
                    var time;
                    var time_sent;
                    if(date.getHours() > 11){
                        time = date.getHours() % 12;
                        console.log(time);
                        if(time < 10){
                            time_sent = "0" + time + " " + date.getMinutes() +  ' PM';
                        }
                        else{
                            time_sent = time + " " + date.getMinutes() + ' PM';
                        }
                    }
                    else{
                        if(time < 10){
                            time_sent = "0" + " " + time + date.getMinutes() + ' AM';
                        }
                        else{
                            time_sent = time + " " + date.getMinutes() +  ' AM';
                        }
                    }
                    // var time_sent = (date.getHours() % 12 + 1) + " " + (date.getMinutes() + 1) + " " + time;
        

                    //SET DATE
                    var date_sent;
                    var monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
                    var year = system_date.getFullYear();
                    var month = system_date.getMonth()+1;
                    var day = system_date.getDate();
                    date_sent = monthNames[month]+' '+day+', '+year;
                    
                    //APPEND
                    $("#msgHistory").append(' <div class="outgoing_msg"> <div class="sent_msg"> <p>' + $("#text_message").val() +'</p> <span class="time_date">' + time_sent + ' | ' + date_sent + '</span> </div> </div> ');
        
                    //SEND SMS
                    $.get("/sendSMS", { employee_id : $(".active_chat").attr("id"), message : $("#text_message").val()}, function(result){
                        //alert(result);
                    });
                    $("#text_message").val("");
                    //Scroll to botom
                    $("#msgHistory").scrollTop($("#msgHistory").prop("scrollHeight"));
                });
            }
        });
    }
});


function changeConversation(){
    $.get("/employeeDetails", {employee_id : $(".active_chat").attr("id")}, function(result){
        $("#texter_name").text(result.first_name + " " + result.last_name + " +63" + result.phone_number);
        $("#texter_details").text(result.farm_name + ": " + result.position);
    });
    $("#msgHistory").empty();
    // alert($(".active_chat").attr("id"));
    $.get("/userConvos", {employee_id : $(".active_chat").attr("id")}, function(result){
        for(var i = 0 ; i < result.length; i++){
            //ADD TO #msgHistory
            if(result[i].origin == "inbound"){
                //append
                $("#msgHistory").append(' <div class="incoming_msg"> <div class="incoming_msg_img"> <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil"> </div> <div class="received_msg"> <div class="received_withd_msg"> <p>' + result[i].message +'</p> <span class="time_date">' + result[i].time + ' | ' + result[i].date + '</span></div> </div> </div>');
            }
            else if(result[i].origin == "outbound"){
                $("#msgHistory").append(' <div class="outgoing_msg"> <div class="sent_msg"> <p>' + result[i].message +'</p> <span class="time_date">' + result[i].time + ' | ' + result[i].date + '</span> </div> </div> ');
            }
        }

    });
    //Scroll to botom
    $("#msgHistory").scrollTop($("#msgHistory").prop("scrollHeight"));
}