/*
 Allow radio inputs as button in regular form
 http://dan.doezema.com/2012/03/twitter-bootstrap-radio-button-form-inputs/

 This stops regular posting for buttons and assigns values to a hidden input
 to enable buttons as a radio.
 */
jQuery(function($) {
    $('div.btn-group[data-toggle-name=*]').each(function(){
        var group   = $(this);
        var form    = group.parents('form').eq(0);
        var name    = group.attr('data-toggle-name');
        var hidden  = $('input[name="' + name + '"]', form);
        $('button', group).each(function(){
            var button = $(this);
            button.live('click', function(){
                hidden.val($(this).val());
            });
            if(button.val() == hidden.val()) {
                button.addClass('active');
            }
        });
    });
});


$.extend( $.fn.dataTableExt.oStdClasses, {
    "sSortAsc": "header headerSortDown",
    "sSortDesc": "header headerSortUp",
    "sSortable": "header"
} );

/*
 Object Browser, This runs whenever "Run Check Plugin" is clicked

 It resets the color of the OK/WARNING/CRITICAL/UNKNOWN button
 Runs a REST call to run the check_command and fetch the results

 Calling button/href needs to have data-object-id="12312abc...."
 */
function ob_run_check_command() {
    // Fetch the calling object
    var modal = $(this);
    // Get the object_id
    var id = modal.attr('data-object-id');

    // Reset the class on the button
    $('#run_check_plugin #pluginstate').removeClass("label-important");
    $('#run_check_plugin #pluginstate').removeClass("label-warning");
    $('#run_check_plugin #pluginstate').removeClass("label-success");
    $('#run_check_plugin #pluginstate').html("Pending");
    $('#run_check_plugin #pluginoutput').html("Executing check plugin");

    // Run the command and fetch the output JSON via REST
    $.getJSON("/rest/pynag/json/run_check_command",
        {
            object_id: id
        },
        function(data) {
            // Default to unknown if data[0] is less than 3
            var statusLabel = 'label-inverse';
            var statusString = 'Unknown';
            if (data[0] == 2) {
                statusLabel = 'label-important';
                statusString = 'Critical';
            }
            if (data[0] == 1) {
                statusLabel = 'label-warning';
                statusString = 'Warning';
            }
            if (data[0] == 0) {
                statusLabel = 'label-success';
                statusString = 'OK';
            }
            // Set the correct class for state coloring box
            $('#run_check_plugin #pluginstate').addClass(statusLabel);

            // Fill it up with the correct status
            $('#run_check_plugin #pluginstate').html(statusString);

            // Put the plugin output in the correct div
            $('#run_check_plugin #pluginoutput').html(data[1]);

            // Show the refresh button
            $('#run_check_plugin_refresh').show();

            // Assign this command to the newly shown refresh button
            $('#run_check_plugin_refresh').click(ob_run_check_command);
        });
    // Stop the button from POST'ing
    return false;
}

(function( $ ) {

    /*
     Creates a dataTable for adagios objects

     aoColumns are used primarily for Titles
     example, aoColumns = [ { 'sTitle': 'Contact Name'}, { 'sTitle': 'Alias' } ]

     */
    $.fn.adagios_ob_configure_dataTable = function (aoColumns, fetch) {
        // Option column
        aoColumns.unshift(
            {
                "sTitle":"register",
                "bVisible":false
            },
            {
                "sTitle":"object_type",
                "bVisible":false
            },
            {
                "sTitle":'', 'sWidth':'32px'
            });
        var $this = $(this);


        $this.data('fetch', fetch);
        $this.data('aoColumns', aoColumns);

        return $this;
    };

    $.fn.adagios_ob_render_dataTable = function (aoColumns, fetch) {
        var $this = $(this);

        $this.dtData = [];
        $this.fetch = $this.data('fetch', fetch);
        $this.aoColumns = $this.data('aoColumns', aoColumns);
        $this.jsonqueries = $this.fetch.length;
        $.each($this.fetch, function (f, v) {

            var object_type = v['object_type'];
            $('#log').append('Populating ' + object_type + $(this).attr('id') + '<br/>');

            var json_query_fields = ['id', 'register'];
            $.each(v['rows'], function (k, field) {
                if ('cName' in field) {
                    json_query_fields.push(field['cName']);
                }
                if ("cAltName" in field) {
                    json_query_fields.push(field['cAltName']);
                }
                if ("cHidden" in field) {
                    json_query_fields.push(field['cHidden']);
                }
            });

            $.getJSON("/rest/pynag/json/get_objects",
                {
                    object_type:object_type,
                    with_fields:json_query_fields.join()
                },
                function (data) {
                    var count = data.length;
                    $.each(data, function (i, item) {
                        var field_array =
                            [item['register'], object_type, '\
    <a href="' + BASE_URL + '/objectbrowser/delete_object/id=' + item['id'] + '">\
        <i class="icon-trash"></i>\
    </a>\
    <input rel="ob_mass_select" name="' + item['id'] + '" type="checkbox">'];
                        $.each(v['rows'], function (k, field) {
                            var cell = '<a href="' + BASE_URL + '/objectbrowser/id=' + item['id'] + '">';
                            var field_value = "";
                            if ("icon" in field) {
                                cell += "<i class=\"" + field.icon + "\"></i> ";
                            }
                            if (item[field['cName']]) {
                                field_value = item[field['cName']];
                            } else {
                                if (item[field['cAltName']]) {
                                    field_value = item[field['cAltName']];
                                }
                            }
                            field_value = field_value.replace("\"", "&quot;");
                            field_value = field_value.replace(">", "&gt;");
                            field_value = field_value.replace("<", "&lt;");
                            if ("truncate" in field && field_value.length > (field['truncate'] + 3)) {
                                cell += "<abbr rel=\"tooltip\" title=\"" + field_value + "\">" + field_value.substr(0, field['truncate']) + " ...</abbr>";
                            } else {
                                cell += field_value;
                            }
                            cell += "</a>";
                            field_array.push(cell);
                            if (field['cName'] == v['rows'][v['rows'].length - 1]['cName']) {
                                $this.dtData.push(field_array);
                                count--;
                            }
                        });
                    });
                }).success(function () {
                    //targetDataTable.fnAddData(dtData);

                    $this.jsonqueries = $this.jsonqueries - 1;

                    //alert($this.jsonqueries);
                    if ($this.jsonqueries == 0) {
                        $("[rel=tooltip]").tooltip();
                        //alert('predtData: ' + $this.dtData[0])
                        $this.data('dtData', $this.dtData);

                        $this.adagios_ob_dtPopulate();
                    }
                }).error(function (jqXHR) {
                    /* TODO - fix this to a this style */
                    targetDataTable = $(this).data('datatable');
                    targetDataTable.parent().parent().parent().html('<div class="alert alert-error"><h3>ERROR</h3><br/>Failed to fetch data::<p>URL: ' + this.url + '<br/>Server Status: ' + jqXHR.status + ' ' + jqXHR.statusText + '</p></div>');
                });
            return this;
        });
    };

    /*
     Populates the datatable

     jsonFields are used for describing which fields to fetch via json and how to handle them
     example, jsonFields = [ { 'cName': "command_name", 'icon_class': "glyph-computer-proces" }, ... ]

     object_type is one of contact, command, host, service, timeperiod
     example, object_type = host
     */
    $.fn.adagios_ob_dtPopulate = function() {
        var $this = $(this);
        var dtData = $this.data('dtData');
        var aoColumns = $this.data('aoColumns');
        $('#' + $this.attr('id') + ' #loading').hide();
        var dt;
        dt = $this.dataTable({
            "aoColumns":aoColumns,
            "sPaginationType":"bootstrap",
            "sScrollY":"260px",
            "bAutoWidth":false,
            "bScrollCollapse":false,
            "bPaginate":true,
            "iDisplayLength":48,
            "aaData":dtData,
            "sDom":'<"toolbar' + $this.attr('id') + '">frtip',
            // Callback which assigns tooltips to visible pages
            "fnDrawCallback":function () {
                $("[rel=tooltip]").tooltip();
                $('input').click(function() {
                    var checked = $('input[rel="ob_mass_select"]:checked').length;
                    $('#bulkselected').html(checked);
                    if (checked > 0) {
                        $('a.bulk').removeClass('inactive');

                    } else {
                        $('a.bulk').addClass('inactive');

                    }
                });
            }
        });
        dt.fnFilter("^" + $this.attr('id') + "$", 1, true);
        dt.fnFilter("1", 0);

        $(".toolbar" + $this.attr('id')).html("<strong>Show:</strong> Templates \
            <input data-target='" + $this.attr('id') + "' name='bong' type='checkbox' id='template" + $this.attr('id') + "'>\
            Groups <input data-target='" + $this.attr('id') + "' name='bong' type='checkbox' id='groups" + $this.attr('id') + "'>\
            ");
        $("#template" + $this.attr('id')).on('click', function (e) {
            var $target = $(e.target);
            if ($target.attr('checked')) {
                $('table#' + $target.attr('data-target')).dataTable().fnFilter("", 0);
            } else {
                $('table#' + $target.attr('data-target')).dataTable().fnFilter("1", 0);
            }
            return true;
        });
        $("#groups" + $this.attr('id')).on('click', function (e) {
            var $target = $(e.target);
            if ($target.attr('checked')) {
                $('table#' + $target.attr('data-target')).dataTable().fnFilter("", 1, true);
            } else {
                $('table#' + $target.attr('data-target')).dataTable().fnFilter("^" + $target.attr('data-target') + "$", 1, true);
            }
            return true;
        });
        dt.fnSort([
            [3, 'asc'],
            [4, 'asc']
        ]);
        //return this.each(function() {
    };
})( jQuery );
