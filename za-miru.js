var za_classes = ['za_single','za_start','za_end','za_nothing'];

function make_range(ranges,start,finish)
{
   ranges.push(start + " to " + finish);
   console.log("added range " + start + " to " + finish);
}


function show_ranges()
{
	var zaday = localStorage.getItem("zaday");
	if (zaday) {
		console.log(zaday);

		var all_ranges =  JSON.parse(zaday);
		console.log(all_ranges);
		var my_string = "";
		
for(var hour in all_ranges)
{
	my_string +=  hour + '=' +   all_ranges[hour].join(";") + "\n";
}

		$('#ranges').html('<PRE>' + my_string +  '</PRE>');
	}
}

function update_ranges(hour,clean_ranges)
{
	var zaday = localStorage.getItem("zaday");
	if (zaday) {
	var all_ranges =  JSON.parse(zaday);
	} else { all_ranges = {} }
	all_ranges[hour] = clean_ranges;
	localStorage.setItem('zaday',JSON.stringify(all_ranges));

}

function generate_ranges()
{
	console.log("started range generator");
	var ranges = [];
	var first_minute = false;
	var tight_interval = 1;
	$('.sb_DIV').each(function(){
		var minute = $(this).attr('minute');
		if ($(this).hasClass('za_single')) {
			if (!first_minute) {
				make_range(ranges,minute,minute);
			}

		}
		if ($(this).hasClass('za_start')) {
			first_minute = minute;
		}
		if ($(this).hasClass('za_end')) {
			make_range(ranges,first_minute,minute);
			first_minute = false;

		}

	});

	if (first_minute) { 
		
		console.log("determined final block is active");
		make_range(ranges,first_minute,59);
	 }
	
	var hour = $(".za_top_DIV").attr('hour');
	var clean_ranges = [];
	var last_start = false;
	var last_end = false;
	ranges.forEach(
	function (item,index) {
	   	var parts = item.split(' ');
		var current_start = parts[0];
		var current_end = parts[2];
		if (!last_start) { last_start = current_start; last_end =  current_end; }
		else { 
		   if (current_start == (last_end + 1)) {
			last_end = current_end;
		   } else {
			clean_ranges.push(hour + ':' + last_start + " to " + hour + ':' +  last_end);
			last_start = current_start; last_end =  current_end;
		   }
		}		
	}
	);

	if (last_start) {
		clean_ranges.push(hour + ':' + last_start + " to " + hour + ':' + last_end);
	}
	update_ranges(hour,clean_ranges);
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
		toggle_set($("#sb_" + minute));
		toggle_set($('.zminute_DIV[minute=' + minute + ']'));
}

$(document).ready(function() {
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
});
