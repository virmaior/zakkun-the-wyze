var za_classes = ['za_single','za_start','za_end','za_nothing'];

function clear_ranges()
{
  localStorage.setItem("zaday",JSON.stringify({}));
  $('#ranges').html('<PRE></PRE>');
  $('#run_string').html('');
}


function make_range(ranges,start,finish, range_label,cam)
{
	my_range = {"s": start , "e" : finish};
        if  (range_label) { 
                if (range_label != "undefined") {
			my_range["label"] = range_label;
                }
        }
	if (cam) {
		if (cam != "undefined") {
			my_range["cam"] = cam;
		}
	}
   ranges.push(my_range);
}


function zsh_decode_item(my_range)
{
        var item_text = "s:" + my_range["s"] + ";e:" + my_range["e"];
	if (my_range["label"]) { item_text += ';l:' + my_range["label"]; }
        if (my_range["cam"]) { item_text += ';c:' + my_range["cam"]; }
        return item_text;
}


function zsh_decode(my_ranges)
{
       var  zsh_output = [];
        my_ranges.forEach(
	function(item,index){
                zsh_output.push( zsh_decode_item(item));
        });
        return zsh_output.join(',');

}

function html_decode(my_ranges) 
{
	var  html_output = "";
	my_ranges.forEach(function(item,i){
		html_output  += html_decode_item(item);
	});
	return html_output;
}


function html_decode_item(my_range)
{
	console.log(my_range);
	var my_cam = 1;
	if (my_range["cam"] ) {  my_cam = my_range["cam"];  }
	var item_text =  '<div class="range_start">' + my_range["s"] + '</div><div class="range_end">' + my_range["e"] + '</div>'; 
	if (my_range["label"]) { item_text += '<div class="range_label">' + my_range["label"] + '</div>'; }
        //if (my_range["cam"] ) { item_text += '<div class="range_cam">' + my_cam + '</div>'; }

	return '<div class="html_range cam_' + my_cam + '">' +  item_text + '</div>';
//	var pieces =  item_text.split(';');
	
}


function show_ranges()
{
	var zaday = localStorage.getItem("zaday");
	if (!zaday) {
		return false;
	}
	var all_ranges =  JSON.parse(zaday);
	console.log(all_ranges);
	var my_string = "";
  	var cam = $(".za_top_DIV").attr('cam');
	var html_output = "";
	for(var hour in all_ranges)
	{
		my_string +=  hour + '>' +   zsh_decode(all_ranges[hour]) + "V\n";
		html_output += '<div class="output_row"><div class="output_hour">' + hour + '</div>' +  html_decode(all_ranges[hour]) + '</div>';
		console.log(my_string);
	}

        var day = $(".za_top_DIV").attr('day');
	
	$('#ranges').html('<PRE>' + html_output +  '</PRE>');
	$('#run_string').html('sudo zsh za-horu.sh d=' + day  + '  i="' + my_string + '"');
	
}

function update_ranges(hour,cam,clean_ranges)
{
	var zaday = localStorage.getItem("zaday");
	if (zaday) {
	var all_ranges =  JSON.parse(zaday);
	} else { all_ranges = {} }
	all_ranges["h:" + hour + ";c:" +  cam ] = clean_ranges;
	localStorage.setItem('zaday',JSON.stringify(all_ranges));

}

function get_range_name(minute)
{
		if ($('.range_label[minute="' + minute +  '"]').length) {
			//console.log("had range label " +  $('.range_label[minute="' + minute +  '"]').val()) ;
			var rrange  = $('.range_label[minute="' + minute +  '"]').val();
			if (rrange != "") { 
						        return rrange.replace(/ /g,"_"); 
			}
		}	
		return false;	
}

function generate_ranges()
{
	console.log("started range generator");
	var ranges = [];
	var first_minute = false;
	var tight_interval = 1;
	var range_name = false;

        var cam = $(".za_top_DIV").attr('cam');
	$('.sb_DIV').each(function(){
	    var minute = $(this).attr('minute');
		if ($(this).hasClass('za_single')) {
			if (!first_minute) {
			     var range_name = get_range_name(minute);
				make_range(ranges,minute,minute,range_name,cam);

			}

		}
		if ($(this).hasClass('za_start')) {
			first_minute = minute;
		}
		if ($(this).hasClass('za_end')) {
			var range_name = get_range_name(first_minute);
			make_range(ranges,first_minute,minute,range_name,cam);
			first_minute = false;
			range_name = false;
		}

	});

	if (first_minute) { 
		
		console.log("determined final block is active");
        	var range_name = get_range_name(first_minute);
		make_range(ranges,first_minute,59,range_name,cam);
	 }

	console.log("tidying ranges");	
	var hour = $(".za_top_DIV").attr('hour');
	var clean_ranges = [];
	var last_start = false;
	var last_end = false;
	var last_name_range =false;
	ranges.forEach(
	function (item,index) {
		/* obj ={};
	   	var parts = item.split(';');
		var i;
		for (i in parts) {
			parts[i] = parts[i].split(":");
			obj[parts[i][0]]=parts[i][1];
		}*/
		console.log(item);
		var current_start = item.s;
		var current_end = item.e;
	        var range_name  = item.label;
		if (!last_start) { last_start = current_start; last_end =  current_end; last_range_name = range_name; }
		else { 
		   if (current_start == (last_end + 1)) {
			last_end = current_end;
		   } else {
			make_range(clean_ranges,last_start,last_end,last_range_name,cam);
			last_start = current_start; last_end =  current_end; last_range_name = range_name;
		   }
		}
		console.log(clean_ranges);
	});

	if (last_start) {
		make_range(clean_ranges,last_start,last_end,last_range_name,cam);
	}
	console.log(clean_ranges);
	update_ranges(hour,cam,clean_ranges);
	show_ranges();
}

function toggle_set(el)
{
	var current_za_class = -1;
	za_classes.forEach(
	function(item,index)
	{
	   if ($(el).hasClass(item)) { current_za_class = index; 
	  	$(el).toggleClass(item)
	   }			
	}
	); 	
	

	$(el).toggleClass(za_classes[(current_za_class+1)%za_classes.length]); 
}


function toggle3(minute)
{
	
		console.log("called toggle 3 on " + minute);
		var mt = $("#sb_" + minute);
		var mxt = $('.zminute_DIV[minute=' + minute + ']');
		toggle_set(mxt);
		mxt.find('.zm_marker .range_label').remove();
		if (mxt.hasClass('za_start')) {
	
			mxt.find('.zm_marker').append('<input minute="' + minute + '" class="range_label" value="" /> ');
		}	
		toggle_set(mt);
}

$(document).ready(function() {
	$(".za_top_DIV").addClass("cam_" + $(".za_top_DIV").attr('cam'));
	$(".zminute_DIV").each(function(){
		var minute = $(this).attr('minute');

		$("#select_bar").append('<div class="sb_DIV" id="sb_' + minute + '" minute="' + minute + '">' + minute + '</div>');
	});
	$(".sb_DIV").addClass('za_nothing');
	$(".za_minute").addClass('za_nothing');
	$(".za_DIV").on('click',
	function(){
		var minute = $(this).parent().attr('minute');
		toggle3(minute);
	});
	$(".sb_DIV").on('click',
	function() {
		var minute = $(this).attr('minute');
		toggle3(minute);

	}
	);
	$(".dim_input").on('change',function() {

		document.documentElement.style.setProperty('--ss_top',$('#top').val() );
		document.documentElement.style.setProperty('--ss_left',$('#left').val() );
		document.documentElement.style.setProperty('--ss_right',$('#right').val() );
		document.documentElement.style.setProperty('--ss_bottom',$('#bottom').val());
	
		console.log('dimensions: top:' + $('#top').val() + ' l:' + $('#left').val() + ' r:'  + $('#right').val() + ' b:' +  $('#bottom').val() );
	});


		
	show_ranges();
	document.documentElement.style.setProperty('--minute_height',Math.floor($(".za_img[minute=00][screen=001]").height() + 1) + "px" );

});

