function clearList(){
    
}

$(document).ready(function(){


    jQuery.ajaxSetup({async: false });
    if($("#purchase_status").text() != "Purchased"){
        $("#update_purchase_btn").toggle("show");
    }

    


    $(window).keydown(function(event){
        if(event.target.tagName != 'TEXTAREA') { // Added to allow enter key on textarea inputs
            if(event.keyCode == 13) {
            event.preventDefault();
            return false;
            }
        }
    });
    $(".type").on("click", function(){
        $("#materials_list").empty();
        var url = "/getMaterialsAjax/" + $(this).text();
        alert( $(this).text());

        $.get(url, {}, function(result){
            var i;
            for(i = 0; i < result.length; i++)
                $("#materials_list").append('<li class="list-group-item"><div><span style="color: rgb(58,59,69);font-weight: bold;">' + result[i].name +'</span><i class="fa fa-ellipsis-h d-inline float-end" style="text-align: right;"></i></div><div><span>' + result[i].mat_desc +'</span></div></li>');
        });
    });

    $("#newitem").on("click", function(){
        var data = {
            type : "Fertilizer",
            fertilizer_name : "Fertiii",
            fertilizer_desc : "New fertilizer desc",
        }
        $.get("/addNewItem", data, function(result){
            alert(result.msg);
        });
    });


    $(".resources_tab").on('click', function(){
        $(".resources_tab.active").css("background", "");
        $(".resources_tab.active").removeClass("active");
        $(this).addClass("active");
        $(this).css("background", "#F0F0F0");

        $("tr.resources").remove();
        //update table
        $.get("/getResourcesPerFarm", {farm_id : $("#farm_id").val(), type : $(this).text()}, function(result){
            var i = 0;
            for(i = 0; i < result.items.length; i++){
                $("#resources_table").append('<tr class="clickable resources"><td>' + result.items[i].item_name +'</td><td>' +  result.items[i].item_type  +'</td><td>' + result.items[i].current_amount +'</td><td>' + result.items[i].units +'<td><i class="fa fa-ellipsis-h d-inline float-end" style="text-align: right;"></i></td></tr>');
            }
            for(i = 0; i < result.blanks.length; i++)
                $("#resources_table").append('<tr class="clickable resources"><td></td><td></td><td></td><td></td><td><i class="fa fa-ellipsis-h d-inline float-end" style="text-align: right;"></i></td></tr>');

        });
    });

    $(".requests").on('click', function(){
        $(".requests.active").css("background", "");
        $(".requests.active").removeClass("active");
        $(this).addClass("active");
        $(this).css("background", "#F0F0F0");

        $("tr.requests").remove();

        $.get("/getResourcesPerFarm", {farm_id : 1, type : $(this).text()}, function(result){
            var i = 0;
            for(i = 0; i < result.items.length; i++){
                $("#resources_table").append('<tr class="clickable resources"><td>' + result.items[i].item_name +'</td><td>' +  result.items[i].item_type  +'</td><td>' + result.items[i].current_amount +'</td><td>sacks</td><td>PHP 500.00</td><td><i class="fa fa-ellipsis-h d-inline float-end" style="text-align: right;"></i></td></tr>');
            }
            for(i = 0; i < result.blanks.length; i++)
                $("#resources_table").append('<tr class="clickable resources"><td></td><td></td><td></td><td>sacks</td><td></td><td><i class="fa fa-ellipsis-h d-inline float-end" style="text-align: right;"></i></td></tr>');

        });
    });

    $(".materials_tab").on('click', function(){
        $(".materials_tab.active").css("background", "");
        $(".materials_tab.active").removeClass("active");
        $(this).addClass("active");
        $(this).css("background", "#F0F0F0");

        var cur_id = $(this).attr("id");
        var url;
        if(cur_id == "all_farms"){
            $("#per_farm_materials").prop("hidden", !this.checked);
            $("#all_farm_materials").removeAttr("hidden");
            url = "/ajaxGetInventory/all_farms";
        }
        else if (cur_id == "per_farm"){
            $("#all_farm_materials").prop("hidden", !this.checked);
            $("#per_farm_materials").removeAttr("hidden");
            url = "/ajaxGetInventory/per_farm";
        }
    });

    $(".purchases_tab").on('click', function(){
        $(".purchases_tab.active").css("background", "");
        $(".purchases_tab.active").removeClass("active");
        $(this).addClass("active");
        $(this).css("background", "#F0F0F0");

        var cur_id = $(this).attr("id");
        var url;
        if(cur_id == "all_farms"){
            $("#per_farm_materials").prop("hidden", !this.checked);
            $("#all_farm_materials").removeAttr("hidden");
            url = "/ajaxGetPurchases/all_farms";
        }
        else if (cur_id == "per_farm"){
            $("#all_farm_materials").prop("hidden", !this.checked);
            $("#per_farm_materials").removeAttr("hidden");
            url = "/ajaxGetPurchasesy/per_farm";
        }
    });

    $("input").on("keyup", function(){
        $(this).css("border-color", "#d1d3e2");
    });
    $("textarea").on("keyup", function(){
        $("#item_name").css("border-color", "#d1d3e2");
    });
    $(".add-material-btn").on("click", function(){
        var cur_id = $(this).attr("id");
        if(cur_id == "step1"){
            //check if complete
            var complete = true;
            if($("#item_name").val().length == 0){
                $("#item_name").css("border-color", "red");
                complete = false;
            }
            if($("#item_desc").val().length == 0){
                $("#item_desc").css("border-color", "red");
                complete = false;
            }
            if(complete){
                // $("#step1_add").prop("hidden", !this.checked);
                $("#step1_add").toggle("hide");
                // $("#step2_add").removeAttr("hidden");
                $("#step2_add").toggle("show");
                $("#step1_status").addClass("finish");
                $("#step2_status").addClass("active");

                $("#review_name").text($("#item_name").val());
                $("#review_type").text($("#item_type").val());
                $("#review_desc").text($("#item_desc").val());
            }
            else{
                alert("Please complete details.");
            }
            
        }
        else if(cur_id == "back"){
            // $("#step1_add").prop("hidden", !this.checked);
            $("#step2_add").toggle("hide");
            // $("#step2_add").removeAttr("hidden");
            $("#step1_add").toggle("show");
            $("#step1_status").removeClass("finish");
            $("#step1_status").addClass("active");
            $("#step2_status").removeClass("active");
        }
    });





    $(".new_purchase").on("click", function(){
        var cur_id = $(this).attr("id");
        var count = $("#add-btn-mat").val();
        if(cur_id == "step1"){
            //check if complete
            if(isComplete(count)){
                //next page
                $("#step1_new_purchase").toggle("hide");
                $("#step2_new_purchase").toggle("show");
                //change status
                $("#step1_status").addClass("finish");
                $("#step2_status").addClass("active");

                //update fields
                $("#review_farm").text($("#farm").find(":selected").text());

                for(i = 1; i < parseInt(count); i++){
                    if($("#item"+i).length > 0)
                        $("#buttons").before('<div class="row review_row" style="top : 5px; bottom: 5px;"><div class="col-4 col-sm-4 col-md-4"><div class=""><div class="dropdown"><label class="form-label" id="review_type' + i +'">' + $("#item_type" + i).val() +'</label></div></div></div><div class="col-4 col-sm-4 col-md-4"><div class=""><div class="dropdown"><label class="form-label" id="review_item' + i +'">' + $("#item" + i).find(":selected").text() +'</label></div></div></div><div class="col-4 col-sm-4 col-md-4"><div class=""><div style="display: flex; flex-flow: row;"><label class="form-label" id="review_amount' + i +'">' + $("#item_amt" + i).val() +'</label><span style="margin-left: 10px;">' + $("#item_unit" + i).text() +'</span></div></div></div></div>');
                }
                if($("#item_desc").val() != null)
                    $("#buttons").before('<div class="form-row review_row" style="padding-top : 15px;"><div class="col-1 col-sm-1 col-md-1" style="padding : 5px;">NOTE</div><div class="col-10 col-sm-10 col-md-10" style="padding: 5px;" >' + $("#item_desc").val() + '</div></div>');
            }
            else{
                alert("Complete missing fields");
            }
            
            
            
        }
        else if(cur_id == "back"){
            // $("#step1_add").prop("hidden", !this.checked);
            $("#step2_new_purchase").toggle("hide");
            // $("#step2_add").removeAttr("hidden");
            $("#step1_new_purchase").toggle("show");
            $("#step1_status").removeClass("finish");
            $("#step1_status").addClass("active");
            $("#step2_status").removeClass("active");
            $(".review_row").remove();
        }
    });

    
});

function isComplete(count){
    var status = true;
    var min;
    if($("#farm").val() == null){
        status = false;
        $("#farm").css("border-color", "red");
    }
    
    for(x = 1; x < parseInt(count); x++){
        if($("#item"+x).val() == null && $("#item"+x).length > 0){
            status = false;
            $("#item"+x).css("border-color", "red");
        }

        if($("#item_type"+x).val() == 'Seed')
            min = 10;
        else if($("#item_type"+x).val() == 'Pesticide')
            min = 20;
        else if($("#item_type"+x).val() == 'Fertilizer')
            min = 30;

        if($("#item_amt"+x).val() < min && $("#item_amt"+x).length > 0){
            status = false;
            $("#item_amt"+x).css("border-color", "red");
            alert(`Amount of ${$('#item'+x+' option:selected').html()} should be greater than or equal to ${min}!`);
        }
    }

    return status;
}
$(document).on('click','.remove-btn', function(){
    $("#row" + $(this).val()).remove();
});
$(document).on('click', "#add-btn-mat", function(){
    var count = $(this).val();
        if($(".new-item").length == 5){
            alert("Limit reached");
        }
        else{
            $(this).after('<button class="remove-btn" style="background: none ;border-style: none;"  value="' + ($(this).val() - 1) +'"><i class="fa fa-minus-circle" style="font-size: 1rem; margin-left: 15px;"></i></button>');
            
            $(this).remove();
            //add new item
            $(".last_item").after('<div class="form-row new-item" id="row' + count +'"><div class="col-4 col-sm-4 col-md-4"><div id="lp-name-wrapper" style="margin-top: 10px;"><div class="dropdown"><select class="form-select purchase_item_type" id="item_type' + count + '" name="item[' + (count - 1)+ '][type]" form="new_purchase"><option value="Seed">Seed</option><option value="Pesticide">Pesticide</option><option value="Fertilizer">Fertilizer</option></select></div></div></div><div class="col-4 col-sm-4 col-md-4"><div id="lp-name-wrapper" style="margin-top: 10px;"><div class="dropdown"><select class="form-select requried" id="item' + count + '" name="item[' + (count - 1)+ '][item]" form="new_purchase"><option disabled selected value> -- select an option -- </option><option class="material_item' + count + '"value="1}">1</option></select></div></div></div><div class="col-4 col-sm-4 col-md-4"><div id="lp-name-wrapper" style="margin-top: 10px;"><div style="display: flex; flex-flow: row;"><input class="form-control text-right required" type="number" placeholder="amount" id="item_amt' + count + '" name="item[' + (count - 1)+ '][amount]" form="new_purchase" style="width: 50%;" /><span style="padding: 10px;" id="item_unit' + count +'">Kg</span> <button class="" style="background: none ; border-style: none;" id="add-btn-mat" value="' + (parseInt(count) + 1) + '"><i class="fa fa-plus-circle" style="font-size: 1rem; margin-left: 15px;"></i></button></div></div></div></div>');
            $(".last_item").removeClass("last_item");
            $("#row" + count).addClass("last_item");

            var select = "item" + count;
            //populate item list
            $.get("/ajaxGetMaterials", {type : "Seed"}, function(result){
                var i;
                for(i = 0; i < result.length; i++){
                    $("#"+select).append('<option class="material_' + select + '"value="' + result[i].id + '">' + result[i].name + '</option>');
                }
            });
        }
});


$(document).on('keyup',".required", function(){
    $(this).css("border-color", "#d1d3e2");
});
$(document).on('change',".required", function(){
    $(this).css("border-color", "#d1d3e2");
});
$(document).on("change",'.purchase_item_type', function(){

    var id = $(this).attr("id");
    var type = $(this).val();
    var select = "item" + id.charAt(id.length - 1);
    // alert(select);
    if(type == "Seed")
        $("#item_unit" + id.charAt(id.length - 1)).text("Kg");
    else{
        $("#item_unit" + id.charAt(id.length - 1)).text("Bags");
    }
    $(".material_" + select).remove();
    $.get("/ajaxGetMaterials", {type : type}, function(result){
        var i;
        for(i = 0; i < result.length; i++){
            $("#"+select).append('<option class="material_' + select + '"value="' + result[i].id + '">' + result[i].name + '</option>');
        }
    });
 });



 //UPDATE PURCHASE
 $(document).on('click',"#update_purchase_btn", function(){
     if($(this).val() == "Pending"){
         $("#process_step").toggle("show");
     }
     else if($(this).val() == "Processing"){
        $("#purchase_step").toggle("show");
     }
});


$(document).on("submit", "#update_purchase_form", function(event){
            if($("#update_purchase_btn").val() == "Processing"){
                a = true;

                console.log($("#purchase_price").val());
                if($("#purchase_price").val() == ""){
                    a = false;
                    $("#purchase_price").css("border-color", "red");
                }
                if($("#amount").val() <= 0 || $("#amount").val() == null){
                    a = false;
                    $("#amount").css("border-color", "red");
                }

                if(!a){
                    event.preventDefault();
                    alert( "Complete details." );
                }
            }
            
});

