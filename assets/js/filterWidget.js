//=================================
// ======== Filter Widget =========
// ==== Ryan Gibbs -- 10/13/21 ====
//=================================

// Widget to get both stored filters (lists) as well as non-stored (Message specific) fliters.
class FilterWidget {
    constructor(target, hideRecipients = false, filterCallback = res => console.log(res), showFilterBtns = true) {
        this.target = target;
        this._hideRecipients = hideRecipients;
        this._selectizePromises = [];
        this._prefillList;
        this._filterCallback = filterCallback;
        this._recipientsCount = 0;
        this._showFilterBtns = showFilterBtns;

        // Attach onclicks to parent element so dynamic events fire.
        this.bindEvents();

        // Generate card/dropdowns and bind 'this' to FilterWidget.        
        this.buildWidget.bind(this);
        this.buildWidget();
    }

    async buildWidget() {
        let criteria = await this.getCriteria();
        this._criteriaJson = criteria;
        let header = this._hideRecipients ? '' : `
            <div>
                <h5 class="card-title text-uppercase">Recipients</h5>
            </div>
            `;
        let selectAll = this._hideRecipients ? '' : `
            <div class="m-1">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
                    <label class="form-check-label text-uppercase" for="flexCheckDefault">
                        All People Available to Me.
                    </label>
                </div>
            </div>
            `;
        let footer = this._hideRecipients ? '' : `
            <div class="m-3 d-flex justify-content-center">
                <a href="javascript:void(0);" class="filterwidget-recipients">Selected 0 recipients</a>
            </div>
            <div class="d-flex justify-content-center text-muted">
                Note: Only people with an account are selected.
                Recipients quantity is based on your visibility level.
            </div>
            `;

        let filterBtns = this._showFilterBtns ? `
            <button type="button" class="btn btn-light save-filter" data-bs-toggle="modal" data-bs-target="#saveAsModal">Save Filter</button>
            <button type="button" class="btn btn-light apply-filter">Apply Filter</button>
        ` : '';

        let card = `
            <div class="card card-body">
                ${header}
                <div class="m-2">      
                    Prefill filter from the dynamic list:    
                    <select id="select-lists" placeholder="Select or type to search..."></select>
                </div>
                <div class="m-2">      
                    Filter matching 
                    <div class="btn-group mx-1" role="group" aria-label="All / Any">
                        <input type="radio" class="btn-check" name="btnradio" id="btn-all" autocomplete="off" checked>
                        <label class="btn btn-outline-primary" for="btn-all">All</label>

                        <input type="radio" class="btn-check" name="btnradio" id="btn-any" autocomplete="off">
                        <label class="btn btn-outline-primary" for="btn-any">Any</label>
                    </div>
                    of the following:
                </div>
                ${selectAll}
                <div class="m-1 criteria-container">   
                </div>
                <div class="m-1">
                    <div class="row">
                        <div class="col">
                            ${this.buildCriteriaDropdown(criteria).prop('outerHTML')}
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-light clear-conditions">Clear</button>
                            ${filterBtns}
                        </div>
                    </div>
                    <div class="row">
                        <div class="col d-flex justify-content-center">
                            <div class="spinner-border filterwidget-loading d-none" role="status"></div>
                        </div>
                    </div>
                </div>
                ${footer}
            </div>`;

        this.target.html(card);

        this.getFilterData('a', res => {    
            this._prefillList = res;   
     
            $('#select-lists').selectize({
                options: res,
                labelField: "title",
                valueField: "id",
                searchField: ["title"],
                preload: true,
                load: this.getFilterData
            });
        });      
        
        this.createSaveAsModal();
    }

    getFilterData (query, callback) {
        // Short circuit for use outside of dev enviroment.
        return callback();
        if (!query.length) return callback();

        $.ajax({
            "url": 'api.php',
            "method": 'POST',
            "dataType": 'json',
            "headers": {
                "Accept": "application/json",
                "Authorization": `Bearer ${Cookies.get('auth')}`
            },
            "data": {
                'authen' : Cookies.get('auth'),
                'action': 'filters',
                'method': 'GET',
                'type' : 'List',
                'params': JSON.stringify({'name' : query}),
                'call': 'ajax'
            }
        })
        .done(res => callback(res.data.data))
        .fail(res => callback());
    }

    saveFilterToServer (data) {
        // Short circuit for use outside of dev enviroment.
        return data;
        $.ajax({
            "url": 'api.php',
            "method": 'POST',
            "dataType": 'json',
            "headers": {
                "Accept": "application/json",
                "Authorization": `Bearer ${Cookies.get('auth')}`
            },
            "data": {
                'authen' : Cookies.get('auth'),
                'action': 'filters',
                'method': 'POST',
                'type' : 'List',
                'params': JSON.stringify(data),
                'call': 'ajax'
            }
        })
        .done(res => Swal.fire("Saved!", res.message, "success"))
        .fail(res => console.error(res));
    }

    getFilterResults (query) {
        // Short circuit for use outside of dev enviroment.
        return null;
        return $.ajax({
            "url": 'api.php',
            "method": 'POST',
            "dataType": 'json',
            "headers": {
                "Accept": "application/json",
                "Authorization": `Bearer ${Cookies.get('auth')}`
            },
            "data": {
                'authen' : Cookies.get('auth'),
                'action': 'peoples',
                'sub' : 'query-builder',
                'method': 'POST',
                'type' : 'List',
                'params': JSON.stringify({data : query}),
                'call': 'ajax'
            }
        })
        .done(res => res)
        .fail(res => console.error(res));
    }

    getFilterResultsFromSelection() {
        $('.filterwidget-loading').first().removeClass('d-none');
        let json = this.getFilterJson();
        this._filterJson = json;

        this.getFilterResults(json).then(res => {
            this.filterResults = res;
            this.setReturnedCount(res.data.total);
            this._filterCallback(res);
            $('.filterwidget-loading').first().addClass('d-none');
        });
    }

    setReturnedCount(count) {
        this._recipientsCount = count;
        $('.filterwidget-recipients').first().text(`Selected ${count} recipients`);
    }

    getReturnedCount() {
        return this._recipientsCount;
    }

    saveFilter() {
        // Save filter selection to DB.
        let json = this.getFilterJson();
        this._filterJson = json;

        let params = {
            created_by: userData.id,
            criteria: JSON.stringify(json),
            filter_slug: encodeURIComponent(JSON.stringify(json)),
            filter_type: 1,
            title: $('#newFilterTitle').val(),
            desc: $('#newFilterDesc').val(),
            expiring: $('#newFilterExpires').is(":checked") ? 1 : 0,
            resource_type: $('.filter-type.active').data('value')
        }

        this.saveFilterToServer(params);
    }

    createSaveAsModal() {
        let expires = new Date(new Date().setDate(new Date().getDate() + 90)).toLocaleDateString();

        this.target.append(`
            <div id="saveAsModal" class="modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Save Filter As...</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <input id="newFilterTitle" type="text" class="form-control mb-2" aria-label="Title" placeholder="Title">
                            <textarea id="newFilterDesc" class="form-control mb-5" aria-label="Description" placeholder="Description"></textarea>
                            <div class="btn-group mb-3 w-100">
                                <button type="button" class="btn btn-outline-secondary filter-type active" data-value="1">
                                     Personal
                                </button>
                                <button type="button" class="btn btn-outline-secondary filter-type" data-value="2">
                                    Shared
                                </button>
                                <button type="button" class="btn btn-outline-secondary filter-type" data-value="3">
                                    Public
                                </button>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="" id="newFilterExpires" checked>
                                <label class="form-check-label" for="flexCheckDefault">
                                    Expires in 90 days (${expires})
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button id="newFilterSave" type="button" class="btn btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    // Creates single criteria line based off selection from + Add Criteria dropdown.
    async buildCriteriaLine(criteria) {       
        let $criteria = $(criteria);
        let criteriaKey = $criteria.data('key');
        let categoryTitle = $criteria.data('title');
        let category = $criteria.data('category');

        // Make sure we've gone deep enough in List.
        if($criteria.children().length > 0) {
            return false;
        }

        // Create statements dropdown.
        let statements = $criteria.data('statements');
        let statementsHtml = this.buildStatementsControls(statements);
        let fields = statementsHtml.fields;
        let id = this.generateUniqueClass('criteria-line');

        // Set up line html and populate unique id and criteria text.
        let html = `
            <div id="${id}" class="card shadow mb-1 criteria-line">
                <div class="card-body py-1">
                    <div class="row py-1">
                        <div class="col criteria-text-container" data-key="${criteriaKey}" data-category="${category}">
                            Where <strong>${categoryTitle}: ${$criteria.text()}</strong>
                            ${statementsHtml.html}   
                        </div>
                        <div class="col-auto">
                            ${this.buildCriteriaDropdown(this._criteriaJson, true).prop('outerHTML')}
                            <button type="button" class="btn-close btn-remove" aria-label="Remove" data-remove="${id}"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
       $(this.target).find('.criteria-container').append(html);

       // If there is a previous Criteria Line, add condition line in between.
       if($(this.target).find('.criteria-container').children().last().prev().hasClass('criteria-line')) {
            $(this.target).find('.criteria-container').children().last().before(this.buildConditionLine());
       }

       $.each(this._selectizePromises, (i, selectize) => {
            loading.show();
            this.createSelectize(selectize);
        });
        this._selectizePromises = [];
        loading.hide();
    }

    // Builds criteria line from Object.
    buildCriteriaLineFromObj(data) {  
        let criteriaKey = data.criteriaKey;
        let categoryTitle = data.categoryTitle;
        let category = data.category;
        let selected = data.selectedOperand?.operand || data.selectedOperand.value;
        let criteria = data.selectedCategory.display;
        let value = data.selectedOperand.value;
        let subcriteria = data.subcriteria;

        // Create statements dropdown.
        let statements = data.selectedCategory.statements;
        let statementsHtml = this.buildStatementsControls(statements, selected, value);
        let fields = statementsHtml.fields;
        let id = this.generateUniqueClass('criteria-line');

        // Set up line html and populate unique id and criteria text.
        let html = `
            <div id="${id}" class="card shadow mb-1 criteria-line">
                <div class="card-body py-1">
                    <div class="row py-1">
                        <div class="col criteria-text-container" data-key="${category}" data-category="${subcriteria}">
                            Where <strong>${categoryTitle}: ${criteria}</strong>
                            ${statementsHtml.html}   
                        </div>
                        <div class="col-auto">
                            ${this.buildCriteriaDropdown(this._criteriaJson, true).prop('outerHTML')}
                            <button type="button" class="btn-close btn-remove" aria-label="Remove" data-remove="${id}"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
       $(this.target).find('.criteria-container').append(html);

       // If there is a previous Criteria Line, add condition line in between.
       if($(this.target).find('.criteria-container').children().last().prev().hasClass('criteria-line')) {
            $(this.target).find('.criteria-container').children().last().before(this.buildConditionLine());
       }
    }

    buildStatementsControls(statements, selectedOption = null, selectedValue = null) {
        let fields;
        let select;
        let $html = $(`
            <div class="d-inline m-1">
                <select class="form-select w-auto d-inline statements-select"></select>
            </div>
        `);
        let value = selectedValue != null ? selectedValue : '';

        // Append conditions to statements-select.
        $.each(statements, (i, s) => {
            let selectedCheck = s.statement == 'Yes' || s.statement == 'No' ? s.statement == 'Yes' ? 1 : 0 : s.statement.replaceAll(' ','_').toLowerCase();
            let selected = selectedCheck == selectedOption ? 'selected' : '';
            $html.children('select').append(`<option value="${s.statement}" data-fields="${s.fields}" data-select="${s?.select || []}" ${selected}>${s.statement}</option>`);

            if(selectedCheck == selectedOption) {
                fields = s.fields;
                select = s?.select || [];
            }
        });

        // Set default.
        if(selectedOption == null) {
            fields = statements[0].fields[0];
            select = statements[0]?.select || [];

            if(typeof fields == "object") {
                fields = fields.type
            }

            $html.append(`
                <div class="d-inline statement-controls">
                    ${this.generateStatmentControl(fields, select, value)}
                </div>
            `)
        } else {
            $.each(fields, (i, field) => {
                if(typeof field == "object") {
                    let val = value[field.field];
                    $html.append(`
                        <div class="d-inline statement-controls">
                            ${this.generateStatmentControl(field.type, select, val)}
                        </div>
                    `);
                } else {
                    $html.append(`
                    <div class="d-inline statement-controls">
                        ${this.generateStatmentControl(field, select, value)}
                    </div>
                `);
                }
            });
        }

        return { html: $html.html(), fields: fields };
    }

    // Creates single criteria line based off selection from + Add Subcriteria dropdown.
    buildSubcriteriaContainerFromObj(filterCat) { 
        let id = this.generateUniqueClass('criteria-line'); 
        let idAll = this.generateUniqueClass('btn-check');
        let idAny = this.generateUniqueClass('btn-check');
        let isAll = filterCat.operand == "all" ? "checked" : "";
        let isAny = filterCat.operand == "any" ? "checked" : "";
        let subLineArr = [];
        let fields = {};

        // Create a new subline for each subfilter.
        $.each(filterCat, (subKey, subfilterCat) => {
            if($.isNumeric(subKey)){    
                let isLast = subKey == Object.keys(filterCat).length - 1;
                let criteriaKey = Object.keys(subfilterCat)[0];
                let categoryKey = Object.keys(subfilterCat[criteriaKey])[0];
                if(categoryKey == 'operand') {
                    categoryKey = Object.keys(subfilterCat[criteriaKey])[1];
                }

                let category = this._criteriaJson[criteriaKey];
                let title = category.title;
                let selectedCategory = category.subcriteria.find(c => c.name == categoryKey);
                let selectedOperand = subfilterCat[criteriaKey][categoryKey];
                let data = {
                    criteriaKey: criteriaKey,
                    categoryTitle: title,
                    category: categoryKey,
                    selectedCategory: selectedCategory,
                    selectedOperand: selectedOperand
                }

                // Add condition line where necessary.
                if(subKey !== '1') {
                    subLineArr.push(this.buildConditionLine(true, isAll));
                }
                
                let subcriteriaLine = this.buildSubcriteriaLineFromObj(data, isLast);
                fields[subKey] = subcriteriaLine?.fields || '';
                subLineArr.push(subcriteriaLine.html);
            }
        });

        let html = `
            <div id="${id}" class="card shadow mb-1 criteria-line">
                <div class="card-body py-1">
                    <div class="row py-1">
                        <div class="subcriteria-wrapper border p-1">
                            <div class="m-2">      
                                Matching 
                                <div class="btn-group subcriteria-toggle mx-1" role="group" aria-label="All / Any">
                                    <input id="btn-all-${idAll}" type="radio" class="btn-check btnTypeAll" name="sub-btn-group-${idAll}" autocomplete="off" ${isAll}>
                                    <label class="btn btn-outline-primary" for="btn-all-${idAll}">All</label>

                                    <input id="btn-any-${idAny}" type="radio" class="btn-check btnTypeAny" name="sub-btn-group-${idAll}" autocomplete="off" ${isAny}>
                                    <label class="btn btn-outline-primary" for="btn-any-${idAny}">Any</label>
                                </div>
                                of the following:
                            </div>
                            ${subLineArr.join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        $(this.target).find('.criteria-container').append(html);

        // If there is a previous Criteria Line, add condition line in between.
        if($(this.target).find('.criteria-container').children().last().prev().hasClass('criteria-line')) {
            $(this.target).find('.criteria-container').children().last().before(this.buildConditionLine());
        }       
    }

    buildSubcriteriaLineFromObj(data, addCriterDropdown = true) {
        let id = this.generateUniqueClass('subcriteria-line');
        let criteriaDropdown = addCriterDropdown ? this.buildCriteriaDropdown(this._criteriaJson, true).prop('outerHTML') : '';

        // Create statements dropdown.
        let statements = data.selectedCategory.statements;
        let statementsHtml = this.buildStatementsControls(statements, data.selectedOperand?.operand || data.selectedOperand.value, data.selectedOperand.value);
        let fields = statementsHtml.fields;
        // Set up line html.
        let html = `
            <div id=${id} class="card shadow mb-1 subcriteria-line">
                <div class="card-body py-1">
                    <div class="row py-1">
                        <div class="col criteria-text-container" data-key="${data.criteriaKey}" data-category="${data.category}">
                            Where <strong>${data.categoryTitle}: ${data.selectedCategory.display}</strong>
                            ${statementsHtml.html}
                        </div>
                        <div class="col-auto">
                            ${criteriaDropdown}
                            <button type="button" class="btn-close btn-remove" aria-label="Remove" data-remove="${id}"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {html: html, fields: fields };
    }

    // Creates single criteria line based off selection from + Add Subcriteria dropdown.
    buildSubcriteriaContainer(criteria) {        
        let name = $(criteria).text();
        let key = $(criteria).data('key');
        let parentName = $(criteria).parent().parent().prev().text();
        let rootCriteria = $(criteria).closest('.criteria-line').find('.card-body');
        let rootCriteriaHtml = $(criteria).closest('.criteria-line').prop('outerHTML');
        let statements = $(criteria).data('statements');
        let category = $(criteria).data('category');

        let idAll = this.generateUniqueClass('btn-check');
        let idAny = this.generateUniqueClass('btn-check');

        // Remove subcriteria button.
        rootCriteria.find('div .dropdown').remove();
        let changedId = $(rootCriteriaHtml).prop('id').replace('criteria', 'subcriteria');

        let html = $(rootCriteriaHtml)
            .addClass('subcriteria-line')
            .removeClass('criteria-line')
            .prop('id', changedId)
            .prop('outerHTML');

        let subcriteriaLine = this.buildSubcriteriaLine(name, key, parentName, statements, category);

        // Remove existing control and Re-add control into sub wrapper.
        rootCriteria.html(`
            <div class="subcriteria-wrapper border p-1">
                <div class="m-2">      
                    Matching 
                    <div class="btn-group subcriteria-toggle mx-1" role="group" aria-label="All / Any">
                        <input id="btn-all-${idAll}" type="radio" class="btn-check btnTypeAll" name="sub-btn-group-${idAll}" autocomplete="off" checked>
                        <label class="btn btn-outline-primary" for="btn-all-${idAll}">All</label>

                        <input id="btn-any-${idAny}" type="radio" class="btn-check btnTypeAny" name="sub-btn-group-${idAll}" autocomplete="off">
                        <label class="btn btn-outline-primary" for="btn-any-${idAny}">Any</label>
                    </div>
                    of the following:
                </div>
                ${html}
                ${this.buildConditionLine(true, 'checked')}
                ${subcriteriaLine.html}
            </div>
        `);

        rootCriteria.find('.dropdown').first().remove();
        rootCriteria.find('.btn-remove').first().attr('data-remove', changedId);
    }

    addNewSubcriteriaLine(criteria) {
        let name = $(criteria).text();
        let key = $(criteria).data('key');
        let parentName = $(criteria).parent().parent().prev().text();
        let wrapper = $('.subcriteria-wrapper');
        let statements = $(criteria).data('statements');
        let category = $(criteria).data('category');

        // Remove subcriteria button.
        wrapper.find('div .dropdown').remove();

        let subcriteriaLine = this.buildSubcriteriaLine(name, key, parentName, statements, category);

        wrapper.append(this.buildConditionLine(true), 'checked')
                .append(subcriteriaLine.html);
    }

    buildSubcriteriaLine(name, key, parentName, statements, category) {
        let id = this.generateUniqueClass('subcriteria-line');

        // Create statements dropdown.
        let statementsHtml = this.buildStatementsControls(statements);
        let fields = statementsHtml.fields;

        // Set up line html.
        let html = `
            <div id=${id} class="card shadow mb-1 subcriteria-line">
                <div class="card-body py-1">
                    <div class="row py-1">
                        <div class="col criteria-text-container" data-key="${key}" data-category="${category}">
                            Where <strong>${parentName}: ${name}</strong>
                            ${statementsHtml.html}
                        </div>
                        <div class="col-auto">
                            ${this.buildCriteriaDropdown(this._criteriaJson, true).prop('outerHTML')}
                            <button type="button" class="btn-close btn-remove" aria-label="Remove" data-remove="${id}"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {html: html, fields: fields };
    }

    // Builds single condition line with unique id.
    buildConditionLine(isSub = false, checked = 'checked') {
        let conditionClass = isSub ? 'subcondition-line' : 'condition-line';
        let id = this.generateUniqueClass(conditionClass);
        
        return `
            <div id="${id}" class="onoffswitch ${conditionClass} mb-1 mx-3">
                <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox btn-criteria" id="myonoffswitch${id}" tabindex="0" disabled ${checked}>
                <label class="onoffswitch-label" for="myonoffswitch${id}">
                    <span class="onoffswitch-inner"></span>
                    <span class="onoffswitch-switch"></span>
                </label>
            </div>
        `;
    }

    // Create dropdown for criteria selection from getCriteria function.
    buildCriteriaDropdown(criteria, isSub) {
        let label = isSub ? "+ Add Subcriteria" : "+ Add Critera";
        let keepOpen = isSub ? "" : "dropdown-keep-open";
        let criteriaClass = isSub ? "subcriteria-item" : "criteria-item";
        let $ulCriteria = $(`<div class="btn-group dropdown">
                                <button type="button" data-bs-toggle="dropdown" class="btn btn-link dropdown-toggle" aria-expanded="false">
                                    ${label}
                                </button>
                                <ul class="dropdown-menu multi-level"></ul>
                            </div>`
        );
        $.each(criteria, function(key, val) {
            let $outerLi = $(`<li class="dropdown-submenu dropdown-item ${keepOpen}">
                                    <a tabindex="-1" href="javascript:void(0);">${val.title}</a>
                                    <ul class="dropdown-menu"></ul>                                    
                            </li>`);

            $(val.subcriteria).each((i,sub) => $outerLi
                .children('ul')
                .first()
                .append(`<li class="dropdown-item ${criteriaClass}">
                            <a tabindex="-1" href="javascript:void(0);" 
                                data-key="${sub.name}" 
                                data-title="${val.title}" 
                                data-category="${key}" 
                                data-statements='${JSON.stringify(sub.statements)}'>${sub.display}
                            </a>
                        </li>`));
            $ulCriteria.children('ul').first().append($outerLi);
        });
        return $ulCriteria;
    }

    // Recursive function to generate unqiue class using target class (e) and the number of those classes in DOM.
    generateUniqueClass(e) {
        let num = $('.' + e).length;
        let id = `${e}-${num}`;
        if($('.' + id).length > 0) {
            this.generateUniqueClass(id);
        } else {
            return id;
        }
    }

    // Gets Criteria from criteria.json. Might be better to have in DB eventually.
    async getCriteria() {
        return await $.getJSON("assets/json/criteria.json");
    }

    // Set filters from filterJson.
    setFilterFromJson(json) {
        try {
            loading.show();
            let filter = JSON.parse(json);
            let operandOuter = filter.operand;
            let sorting = filter?.sorting || {directon: 'desc', field: 'alphabetical'};

            // Clear any existing data.
            $('.criteria-container').empty();

            // Parse outer rows.
            $.each(filter, (key, filterCat) => {
                // Get only numeric keys.
                if($.isNumeric(key) || (key !== 'operand' && key !== 'sorting')){  
                    if(Object.keys(filterCat).length > 2) {
                        // Handle sub-criteria.
                        this.buildSubcriteriaContainerFromObj(filterCat);             
                    } else {
                        // Handle criteria.
                        let criteriaKey = Object.keys(filterCat)[0];
                        let categoryKey = Object.keys(filterCat[criteriaKey])[0];
                        if(categoryKey == 'operand') {
                            categoryKey = Object.keys(filterCat[criteriaKey])[1];
                        }
                        let category = this._criteriaJson[categoryKey];
                        let title = category.title;
                        let subcriteria = Object.keys(filterCat[criteriaKey][categoryKey])[0];
                        let selectedCategory = category.subcriteria.find(c => c.name == subcriteria);
                        let selectedOperand = filterCat[criteriaKey][categoryKey][subcriteria];

                        this.buildCriteriaLineFromObj({
                            criteriaKey: criteriaKey,
                            subcriteria: subcriteria,
                            categoryTitle: title,
                            category: categoryKey,
                            selectedCategory: selectedCategory,
                            selectedOperand: selectedOperand
                        });
                    }
                }
            });

            // Set Any/All Controls.
            if(operandOuter == 'all') {
                $('#btn-all').attr('checked', true);
                $('#btn-any').attr('checked', false);
                this.toggleAnyAll($('.condition-line'), true);
            } else {
                $('#btn-all').attr('checked', false);
                $('#btn-any').attr('checked', true);
                this.toggleAnyAll($('.condition-line'), false);
            }

            $.each(this._selectizePromises, (i, selectize) => {
                loading.show();
                this.createSelectize(selectize);
            });
            this._selectizePromises = [];
            loading.hide();
        }
        catch(e) {
            Swal.fire("Error", "Error with selected filter.", "error");
            console.error(e);
            loading.hide();
        } 
    }

    // Get the filter parameters from the user's selections.
    getFilterJson() {
        let json = {};

        json['operand'] = $('#btn-all').is(':checked') ? 'all' : 'any';

        $.each($('.criteria-line'), (i, line) => {
            let ind = i+1;
            let category = $(line).find('.criteria-text-container').data('category');
            let key = $(line).find('.criteria-text-container').data('key');
            let condition = $(line).find('.criteria-text-container select').val();
            let value = $(line).find('.criteria-text-container input').val();
            json[ind] = {};

            // Check if single condition or sub conditions.
            let subcondition = $(line)?.find('.subcriteria-wrapper') || null;

            if(subcondition.length > 0){
                $.each(subcondition, (key, subcond) => {
                    // Handle line with subcriteria.
                    let subconditionOperand = $(subcond).find('.btnTypeAll').is(':checked') ? 'all' : 'any';
                    json[ind] = {operand: subconditionOperand};

                    $.each($(subcond).find('.subcriteria-line'), (j, subline) => {
                        let ind2 = j+1;
                        let category2 = $(subline).find('.criteria-text-container').data('category');
                        let key2 = $(subline).find('.criteria-text-container').data('key');
                        let condition2 = $(subline).find('.criteria-text-container select').val();
                        let value2 = $(subline).find('.criteria-text-container input').val();

                        json[ind][ind2] = {};
                        json[ind][ind2][category2] = {};
                        json[ind][ind2][category2][key2] = {};

                        if(condition2 == "Yes") {
                            value = 1;
                            json[ind][ind2][category2][key2].value = value2;
                        } else if(condition2 == "No") {
                            value = 0;
                            json[ind][ind2][category2][key2].value = value2;
                        }
                        else {
                            json[ind][ind2][category2][key2] = {operand: condition2, value: value2};
                        }
                    });
                });
            } else {
                // Handle each single line criteria.
                json[ind][ind] = {};
                json[ind][ind][category] = {};
                json[ind][ind][category][key] = {};

                if(condition == "Yes") {
                    value = 1;
                    json[ind][ind][category][key].value = value;
                } else if(condition == "No") {
                    value = 0;
                    json[ind][ind][category][key].value = value;
                }
                else {
                    json[ind][ind][category][key] = {operand: condition, value: value};
                }
            } 
        });

        return json;
    }

    async createSelectize(selectize) {
        loading.show();
        let target = selectize.target;
        let values = selectize.values;
        let setupFunction = selectize.setupFunction;
        let dataFunction = selectize.dataFunction;
        let filter = selectize.filter;
        let select;
    
        if(filter != null) {
            select = await setupFunction($(`#${target}`), filter);
        } else {
            select = await setupFunction($(`#${target}`));
        }

        if(values != '' && values != null && dataFunction != null) {
            let res = values.map(async id => {
                return await dataFunction(id);
            });
            Promise.all(res).then(res => {
                $.each(res, (i, val) => select[0].selectize.addOption(val.data || val[0]));
                select[0].selectize.setValue(values, false);
            });
        }
        loading.hide();
    }

    generateStatmentControl(type, select = [], value = '') {
        if (!type) return '';

        let id;
        let selectOptions = $.map(select,  option => `<option value="${option}">${option}</option>`);

        let control;
        switch(type) {
            case "input":
                control = `<input type="text" class="form-control w-auto d-inline" value="${value}"></input>`;
                break;
            case "date":
                value == '' ? value = moment() : value;
                let formatted = moment(value, "YYYY-MM-DD").format("MM/DD/YYYY");
                control = `<input type="text" class="form-control w-auto d-inline" data-provide="datepicker" value="${formatted}">`;
                break;
            case "days":
                control = `<input type="number" class="form-control w-auto d-inline" value="${value}"></input>`;
                break;
            case "number":
                control = `<input type="number" class="form-control w-auto d-inline" value="${value}"></input>`;
                break;
            case "select":
                control = `<select class="form-select w-auto d-inline" value="${value}">${selectOptions}</select>`;
                break;
            case "selectize:coalitions":
                id = `selectize-coalitions-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpCoalitionsSelect,
                    dataFunction: getCoalitionsById
                });
                break;
            case "selectize:states":
                id = `selectize-states-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpStateSelect,
                    dataFunction: getStateById
                });
                break;
            case "selectize:upper_house":
                id = `selectize-upper_house-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpDistrictSelect,
                    dataFunction: getDistrictById
                });
                break;
            case "selectize:lower_house":
                id = `selectize-lower_house-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpDistrictSelect,
                    dataFunction: getDistrictById
                });
                break;
            case "selectize:state_region":
                id = `selectize-state_region-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpRegionsSelect,
                    dataFunction: getRegionById
                });
                break;
            case "selectize:roles":
                id = `selectize-roles-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpRoleSelect,
                    dataFunction: getSystemAndCustomRoles
                });
                break;
            case "selectize:system_roles":
                id = `selectize-system_roles-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpSystemRoleSelect,
                    dataFunction: getAllSystemRoles
                });
                break;
            case "selectize:custom_roles":
                id = `selectize-custom_roles-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpCustomRoleSelect,
                    dataFunction: getAllRoles
                });
                break;
            case "selectize:teams":
                id = `selectize-teams-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpTeamsSelect,
                    dataFunction: setUpTeamsSelect
                });
                break;
            case "selectize:district":
                id = `selectize-district-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpDistrictSelect,
                    dataFunction: getDistrictById
                });
                break;
            case "selectize:lists":
                id = `selectize-lists-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpListsSelect,
                    dataFunction: getListsById
                });
                break;
            case "selectize:tags":
                id = `selectize-tags-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpTagsSelect,
                    dataFunction: getTags
                });
                break;
            case "selectize:system_tags":
                id = `selectize-system_tags-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpTagsSelect,
                    dataFunction: getTags
                });
                break;
            case "selectize:custom_tags":
                id = `selectize-custom_tags-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpTagsSelect,
                    dataFunction: getTags
                });
                break;
            case "selectize:person":
                id = `selectize-person-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpPeopleSelect,
                    dataFunction: getPeopleById
                });
                break;
            case "selectize:activies":
                id = `selectize-activies-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpCBActivitySelect,
                    dataFunction: getCBActivitesById
                });
                break;
            case "selectize:campaign":
                id = `selectize-campaign-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpCampaignsSelect,
                    dataFunction: getCampaignsById
                });
                break;
            case "selectize:fb_campaign":
                id = `selectize-fb_campaign-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpFbCampaignsSelect,
                    dataFunction: getCampaignsById
                });
                break;
            case "selectize:support_source":
                id = `selectize-support_source-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpSupportSourceSelect,
                    dataFunction: getSupportSourceById
                });
                break;
            case "selectize:webinars":
                id = `selectize-webinars-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpFbCampaignsSelect,
                    dataFunction: getSupportSourceById
                });
                break;
            case "selectize:webinars_single":
                id = `selectize-webinars_single-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: 'single_session',
                    values: value,
                    setupFunction: setUpFbCampaignsSelect,
                    dataFunction: getSupportSourceById
                });
                break;
            case "selectize:webinars_series":
                id = `selectize-webinars_series-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: 'series',
                    values: value,
                    setupFunction: setUpFbCampaignsSelect,
                    dataFunction: getSupportSourceById
                });
                break;
            case "selectize:webinars_sequence":
                id = `selectize-webinars_sequence-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: 'sequence',
                    values: value,
                    setupFunction: setUpFbCampaignsSelect,
                    dataFunction: getSupportSourceById
                });
                break;
            case "selectize:email_blasts":
                id = `selectize-email_blasts-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpEmailBlastsSelect,
                    dataFunction: getEmailBlastsById
                });
                break;
            case "selectize:notifications":
                id = `selectize-notifications-${this._selectizePromises.length}`;
                control = `<select id="${id}" placeholder="Type to search..."></select>`;
                
                this._selectizePromises.push({
                    target: id,
                    filter: null,
                    values: value,
                    setupFunction: setUpNotificationsSelect,
                    dataFunction: getNotificationsById
                });
                break;
            default:
                if(!type.includes('selectize:')) {
                    control = `<span class="mx-1">${type}</span>`;
                }           
                break;
        }
        return control;
    }

    toggleAnyAll(lines, isAll) {
        $.each(lines, (i, line) => {
            $(line).find('input').attr('checked', isAll);
        });
    }

    // Bind click events for dynamically created objects.
    bindEvents() {
        let thisClass = this;

        // Conditions Clear button.
        $(this.target).on('click', '.clear-conditions', function(e) {
            if ($(e.target).hasClass('btn')) {
                $('.criteria-container').empty();
                thisClass.getFilterResultsFromSelection();
            }
        });

        // Save Filter button.
        $(this.target).on('click', '.save-filter', function(e) {
            if ($(e.target).hasClass('btn')) {
                // Modal launches from button.
                //thisClass.saveFilter();
            }
        });

        // Apply Filter button.
        $(this.target).on('click', '.apply-filter', function(e) {
            if ($(e.target).hasClass('btn')) {
                thisClass.getFilterResultsFromSelection();
            }
        });

        // Criteria dropdown onclick.
        $(this.target).on('click', '.criteria-item', e => this.buildCriteriaLine(e.target));

        // Subcriteria dropdown onclick.
        $(this.target).on('click', '.subcriteria-item', e => {
            // Check if container for subcriteria exists.
            if($(e.target).closest('.criteria-line').find('.subcriteria-wrapper').length == 0) {
                // Create container.
                this.buildSubcriteriaContainer(e.target);
            } else {
                // Add new line to existing container.
                this.addNewSubcriteriaLine(e.target);
            }
        });

        // Remove line.
        $(this.target).on('click', '.btn-remove', function(e) {
            if ($(e.target).hasClass('btn-remove')) {
                let removeTarget = $('.criteria-container').find('#' + $(e.target).data('remove'));
                let $parent = removeTarget.parent();

                // Check if first item and remove condition line below if it is.
                if(removeTarget.attr('id') == $('.criteria-container').children().first().attr('id') ||
                    removeTarget.attr('id') == $('.subcriteria-wrapper').children('.subcriteria-line').first().attr('id')) {
                    if(removeTarget.next().hasClass('condition-line') || removeTarget.next().hasClass('subcondition-line')) {                    
                        removeTarget.next().remove();
                    }
                }

                // Check for condition line and remove too.
                if(removeTarget.prev().hasClass('condition-line')) {                    
                    removeTarget.prev().remove();
                }

                // Remove line.
                removeTarget.remove();

                // Check if all subconditions have been removed, and if so, remove whole line.
                if($parent.children().length == 1) {
                    let $lineContainer = $parent.closest('.criteria-line');

                    if($lineContainer.next().hasClass('condition-line')) {                    
                        $lineContainer.next().remove();
                    }

                    $lineContainer.remove();
                }
            }
        });

        // Determine if All or Any is selected.
        $(this.target).on('click', '#btn-all', function(e) {
            thisClass.toggleAnyAll($('.condition-line'), true);
        });

        // Determine if All or Any is selected.
        $(this.target).on('click', '#btn-any', function(e) {
            thisClass.toggleAnyAll($('.condition-line'), false);
        });

        // Determine if All or Any is selected for subcriteria.
        $(this.target).on('click', '.subcriteria-toggle input', function(e) {
            let subconditions = $(this).closest('.subcriteria-wrapper').find('.subcondition-line');
            let all = $(e.target).hasClass('btnTypeAll');
            thisClass.toggleAnyAll(subconditions, all);
        });

        // Create new controls based off statements-select :selected.
        $(this.target).on('change', '.statements-select', function(e) {
            let $selected = $(e.target).find(`:selected`);
            let $target = $selected.closest('.criteria-text-container').find('.statement-controls');
            let fields = $selected.data('fields').split(',');

            $target.empty();

            if(fields.length > 0) {
                $.each(fields, function (i, field) {
                    let select = $selected.data('select')?.split(',') || [];
                    let control = thisClass.generateStatmentControl(field, select);
                    $target.append(control);
                });
            } 

            thisClass.getFilterResultsFromSelection();
        });

        // Populate filter from select change.
        $(this.target).on('change', '#select-lists', function(e) {
            let list = thisClass._prefillList;
            let selected = $(e.target).val();
            let selectedRecord = list.filter(r => r.id == selected);
            thisClass.setFilterFromJson(selectedRecord[0].criteria);
            thisClass.getFilterResultsFromSelection();
        });

        // Update when input is exited.
        $(this.target).on('focusout', '.criteria-container input', function(e) {
            thisClass.getFilterResultsFromSelection();
        });

        // Handle filter-type toggle buttons.
        $(this.target).on('click', '.filter-type', function(e) {
            $('.filter-type').removeClass('active');
            $(this).addClass('active');
        });

        // Save filter.
        $(this.target).on('click', '#newFilterSave', function(e) {
            thisClass.saveFilter();
        });
        
        // Prevent menu closing when clicking on menu items, but not sub-menu items.
        $(this.target).on('click', '.dropdown-submenu', function(e) {
            if($(e.target).hasClass('dropdown-keep-open') || $(e.target).parent().hasClass('dropdown-keep-open')) {
                e.stopPropagation();
            }
        });
    }
}


