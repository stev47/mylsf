$(function () {
    $('#lectures').DataTable({
        dom: 't',
        autoWidth: false,
        columns: [
            { data: 'name' },
            { data: 'type' },
        ],
        ajax: {
            url: '/major/079/lectures',
            dataSrc: '',
        },
        pageLength: -1,
    });


    Q($.getJSON('/majors')).then(function (data) {
        var majors = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: data,
        });
        majors.initialize();

        $('#search').typeahead({

        }, {
            name: 'majors',
            displayKey: 'name',
            source: majors.ttAdapter(),
        });

        $('#search').on('typeahead:selected', function (e, obj, category) {
            $('#lectures').DataTable().ajax.url('/major/' + obj.lsf_num + '/lectures').load();

        });
    });
});
