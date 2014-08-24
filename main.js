$(function () {
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
    });
});
