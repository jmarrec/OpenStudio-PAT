import jetpack from 'fs-jetpack';
//const {shell} = require('electron');
import {remote} from 'electron';
const {shell} = remote;

export class ModalBclController {

  constructor($log, $q, $uibModalInstance, $uibModal, $scope, toastr, BCL, params, Project, MeasureManager) {
    'ngInject';

    const vm = this;
    vm.$uibModalInstance = $uibModalInstance;
    vm.$log = $log;
    vm.$q = $q;
    vm.$uibModal = $uibModal;
    vm.$scope = $scope;
    vm.BCL = BCL;
    vm.Project = Project;
    vm.toastr = toastr;
    vm.jetpack = jetpack;
    vm.shell = shell;
    vm.params = params;
    vm.MeasureManager = MeasureManager;

    vm.selected = null;
    vm.keyword = '';

    vm.myMeasuresDir = vm.Project.getMeasureDir();
    vm.localDir = vm.Project.getLocalBCLDir();
    vm.projectDir = vm.Project.getProjectMeasuresDir();

    vm.filters = {
      my: true,
      local: true,
      bcl: false,
      project: true
    };

    vm.types = {
      ModelMeasure: true,
      EnergyPlusMeasure: true,
      ReportingMeasure: true
    };

    vm.$scope.categories = [];
    vm.getBCLCategories();

    // set filters and types with incoming params
    vm.setTypes();
    vm.setFilters();

    // get project measures
    vm.projectMeasures = vm.Project.getMeasuresAndOptions();
    vm.$log.debug("Project Measures(): ", vm.projectMeasures);

    // get measures array for Library display
    vm.$scope.displayMeasures = [];

    // initialize structure of libMeasures
    vm.libMeasures =  {
      my: [],
      local: [],
      bcl: []
    };

    // get all measures (this also checks for updates)
    // TODO: add getBCL measures to this?
    vm.BCL.getMeasures().then((measures) => {
      vm.libMeasures = measures;
      vm.$log.debug("LibMeasures retrieved from BCL.getMeasures(): ", vm.libMeasures);
      // reload BCL measures
      // TODO: check for BCL updates once when PAT launches  (in BCL service)
      vm.getBCLMeasures();

      _.forEach(vm.libMeasures.my, (m) => {
        vm.$log.debug('Added to project: ', m.addedToProject, 'measure: ', m.name);
      });

      // apply filters
      vm.resetFilters();

      vm.$log.debug('DISPLAY MEASURES', vm.$scope.displayMeasures);

    });

    // Library grid
    vm.libraryGridOptions = {
      columnDefs: [{
        name: 'display_name',
        displayName: 'bcl.columns.name',
        enableCellEdit: false,
        headerCellFilter: 'translate',
        width: '35%'
      }, {
        name: 'location',
        displayName: '',
        enableCellEdit: false,
        cellClass: 'location-cell',
        cellTemplate: '<span>{{row.entity.location == "my" ? "My" : "BCL"}}</span>',
        width: '9%'
      }, {
        name: 'type',
        displayName: 'bcl.columns.type',
        cellTemplate: '<img ng-src="assets/images/{{grid.getCellValue(row, col)}}_icon.png" alt="{{grid.getCellValue(row, col)}}">',
        enableCellEdit: false,
        enableSorting: false,
        cellClass: 'icon-cell',
        headerCellFilter: 'translate',
        width: '14%'
      }, {
        name: 'author',
        displayName: 'bcl.columns.author',
        enableCellEdit: false,
        headerCellFilter: 'translate',
        visible: false
      }, {
        name: 'date',
        displayName: 'bcl.columns.date',
        cellFilter: 'date:"dd/MM/yyyy"',
        enableCellEdit: false,
        headerCellFilter: 'translate',
        type: 'date',
        width: '10%'
      }, {
        name: 'edit',
        displayName: 'bcl.columns.edit',
        cellClass: 'dropdown-button',
        cellTemplate: 'app/bcl/tempEditButtonTemplate.html',
        enableCellEdit: false,
        headerCellFilter: 'translate',
        width: '14%'
      }, {
        name: 'status',
        displayName: 'bcl.columns.status',
        cellClass: 'icon-button',
        cellTemplate: 'app/bcl/updateButtonTemplate.html',
        enableCellEdit: false,
        headerCellFilter: 'translate',
        width: '10%'
      }, {
        name: 'add',
        displayName: 'bcl.columns.add',
        cellClass: 'icon-cell',
        cellTemplate: 'app/bcl/addButtonTemplate.html',
        enableCellEdit: false,
        headerCellFilter: 'translate',
        width: '10%'
      }],
      data: 'displayMeasures',
      rowHeight: 45,
      /*enableCellEditOnFocus: true,*/
      enableHiding: false,
      enableColumnMenus: false,
      enableRowSelection: true,
      enableRowHeaderSelection: false,
      multiSelect: false,
      onRegisterApi: function (gridApi) {
        vm.gridApi = gridApi;
        gridApi.selection.on.rowSelectionChanged(null, row => {
          if (row.isSelected) {
            vm.selected = row.entity;
          } else {
            // No rows selected
            vm.selected = null;
          }
        });
        gridApi.cellNav.on.navigate(null, newRowCol => {
          vm.gridApi.selection.selectRow(newRowCol.row.entity);
        });
      }
    };
  }

  // set filters from parameters (if array isn't empty)
  setFilters() {
    const vm = this;
    if (!vm.params.filters.length == 0) {
      _.forEach(vm.filters, (val, key) => {
        vm.filters[key] = !!_.includes(vm.params.filters, key);
      });
    }
  }

  // set types from parameters (if array isn't empty)
  setTypes() {
    const vm = this;
    if (!vm.params.types.length <= 0) {
      _.forEach(vm.types, (val, key) => {
        vm.types[key] = !!_.includes(vm.params.types, key);
      });
    }
  }

  getBCLMeasures() {
    const vm = this;
    vm.BCL.getBCLMeasures().then(response => {
      vm.libMeasures.bcl = response;
    });
  }

  // get measures for display based on filter values
  setDisplayMeasures() {
    const vm = this;
    vm.$log.debug('in setDisplayMeasures');
    vm.$log.debug('FILTERS: ', vm.filters);
    const measures = [];
    //vm.$log.debug('libMeasures: ', vm.libMeasures);
    // add checked
    _.forEach(vm.filters, (val, key) => {
      if (val) {
        vm.$log.debug('key: ', key);
        vm.$log.debug('measures: ', vm.libMeasures[key]);
        _.forEach(vm.libMeasures[key], m => {
          // add if not found
          if (!(_.find(measures, {uid: m.uid}))) measures.push(m);
        });
      }
    });

    // TODO: PROJECT MEASURES?

    vm.$scope.displayMeasures = measures;
    return measures;
  }

  // TODO: move most of this processing to BCL service
  getBCLCategories() {
    const vm = this;

    vm.BCL.getCategories().then(response => {

      if (response.data.term) {
        const categories = [];
        // 3 possible levels of nesting
        _.forEach(response.data.term, term => {
          const cat1 = _.pick(term, ['name', 'tid']);
          cat1.checked = false;
          const cat1Terms = [];
          _.forEach(term.term, term2 => {
            const cat2 = _.pick(term2, ['name', 'tid']);
            cat2.checked = false;
            const cat2Terms = [];
            _.forEach(term2.term, term3 => {
              const cat3 = _.pick(term3, ['name', 'tid']);
              cat3.checked = false;
              cat2Terms.push(cat3);
            });
            cat2.children = cat2Terms;
            cat1Terms.push(cat2);
          });
          cat1.children = cat1Terms;
          categories.push(cat1);
        });

        vm.$log.debug('Categories: ', categories);
        vm.$scope.categories = categories;

      }
    });
  }

  // process measures filter changes
  resetFilters(level = null, namesArr = []) {
    const vm = this;
    vm.setDisplayMeasures();
    vm.resetTypeFilters();
    vm.resetCategoryFilters(level, namesArr);
  }

  // process measure type filter changes
  resetTypeFilters() {
    const vm = this;
    const typesArr = [];
    _.forEach(vm.types, (val, key) => {

      if (val) {
        typesArr.push(key);
      }
    });
    const newMeasures = [];
    _.forEach(vm.$scope.displayMeasures, (m) => {
      if (_.includes(typesArr, m.type)) newMeasures.push(m);
    });

    vm.$scope.displayMeasures = _.filter(vm.$scope.displayMeasures, m => {
      return _.includes(typesArr, m.type);
    });
  }

  // filter measure by BCL categories
  resetCategoryFilters(level = null, namesArr = []) {
    const vm = this;
    const catsArr = [];

    vm.$log.debug('level: ', level, ' namesArr: ', namesArr);

    // first check/uncheck sub categories (if a filter change just happened)
    if (level != null) {
      if (level == 1) {
        _.forEach(vm.$scope.categories, (cat1) => {
          if (cat1.name == namesArr[0]) {
            // set/unset to match cat1
            _.forEach(cat1.children, (cat2) => {
              cat2.checked = cat1.checked;
              _.forEach(cat2.children, (cat3) => {
                cat3.checked = cat1.checked;
              });
            });
          }
        });
      } else if (level == 2) {
        _.forEach(vm.$scope.categories, (cat1) => {
          if (cat1.name == namesArr[0]) {
            _.forEach(cat1.children, (cat2) => {
              if (cat2.name == namesArr[1]) {
                _.forEach(cat2.children, (cat3) => {
                  cat3.checked = cat2.checked;
                });
                // if unchecking, must uncheck higher cat
                if (cat2.checked == false) {
                  cat1.checked = cat2.checked;
                }
              }
            });
          }
        });
      } else if (level == 3) {
        _.forEach(vm.$scope.categories, (cat1) => {
          if (cat1.name == namesArr[0]) {
            _.forEach(cat1.children, (cat2) => {
              if (cat2.name == namesArr[1]) {
                _.forEach(cat2.children, (cat3) => {
                  if (cat3.name == namesArr[2]) {
                    if (cat3.checked == false) {
                      cat2.checked = cat3.checked;
                      cat1.checked = cat3.checked;
                    }
                  }
                });
              }
            });
          }
        });
      }
    }

    // now traverse nested structure and find all names with checked == true
    _.forEach(vm.$scope.categories, (cat1) => {

      if (cat1.checked) {
        // add checked to filter list
        catsArr.push(cat1.name);

      } else {
        // look on 2nd level
        _.forEach(cat1.children, (cat2) => {
          if (cat2.checked) {
            catsArr.push(cat2.name);
          } else {
            // look on 3rd level
            _.forEach(cat2.children, (cat3) => {
              if (cat3.checked) {
                catsArr.push(cat3.name);
              }
            });
          }
        });
      }
    });

    // then look at all measure and see if the tags contain any of the items in the array
    if (catsArr.length > 0) {
      vm.$scope.displayMeasures = _.filter(vm.$scope.displayMeasures, m => {
        let found = false;
        _.forEach(catsArr, (cat) => {
          if (m.tags.indexOf(cat) > -1) {
            found = true;
          }
        });
        return found;
      });

    }

  }

  // add measure to project
  addMeasure(rowEntity) {

    const vm = this;
    const measure = _.find(vm.$scope.displayMeasures, {uid: rowEntity.uid});

    vm.addToProject(measure);
    vm.$log.debug('Adding the following measure to project: ', measure);
  }

  addToProject(measure) {
    const vm = this;

    // copy on disk
    const src = (measure.location == 'my') ? vm.myMeasuresDir : vm.localDir;
    const dirNames =_.split(measure.measure_dir, '/');
    //vm.$log.debug('DIR NAMES: ', dirNames);
    const dirName = _.last(dirNames);
    //vm.$log.debug('DIR NAME: ', dirName);
    src.copy(dirName, vm.projectDir.path(dirName));

    // add to project measures
    measure.addedToProject = true;
    const project_measure = angular.copy(measure);
    project_measure.measure_dir = vm.projectDir.path(dirName);

    vm.projectMeasures.push(project_measure);
  }

  // download from BCL (via service)
  download(measure) {
    const vm = this;
    vm.BCL.downloadMeasure(measure).then(newMeasure => {
      vm.$log.debug('In modal download()');
      vm.$log.debug("Local Measures: ", vm.libMeasures.local);
      vm.$log.debug('new measure: ', newMeasure);
      vm.resetFilters();
      // select newly added row
      vm.selectARow(measure.uid);
    });
  }

  // select row in table based on UID
  selectARow(uid) {
    const vm = this;
    const index = _.findIndex(vm.$scope.displayMeasures, {uid: uid});
    vm.gridApi.grid.modifyRows(vm.$scope.displayMeasures);
    vm.gridApi.selection.selectRow(vm.$scope.displayMeasures[index]);
  }

  // edit My measure
  editMeasure(measure) {
    const vm = this;
    vm.$log.debug('in EDIT MEASURE function');
    console.log(measure.measure_dir + '/measure.rb');
    // show toastr for 2 seconds then open file
    const msg = 'Measure \'' + measure.name + '\' will open in a text editor for editing.';
    vm.toastr.info(msg, { timeOut: 3000, onHidden: function() {
      //vm.$log.debug('Opening measure file');
      vm.shell.openItem(measure.measure_dir + '/measure.rb');
    }});
  }

  // update Project measure
  updateProjectMeasure(measure) {
    const vm = this;
    const deferred = vm.$q.defer();
    vm.$log.debug('in UPDATE MY MEASURE function');

    // copy on disk
    const src = (measure.location == 'my') ? vm.myMeasuresDir : vm.localDir;
    const dirNames =_.split(measure.measure_dir, '/');
    const dirName = _.last(dirNames);
    src.copy(dirName, vm.projectDir.path(dirName), {overwrite: true});

    // retrieve newly copied measure data (with calculated arguments)
    vm.$log.debug('DirName: ', dirName);
    vm.$log.debug('src path: ', src.path());
    vm.$log.debug("ProjectDir path: ", vm.projectDir.path());

    // set seed path
    const defaultSeed = vm.Project.getDefaultSeed();
    const osmPath = (defaultSeed == null) ? null : vm.seedDir.path(defaultSeed);

    vm.MeasureManager.computeArguments(vm.projectDir.path(dirName), osmPath).then((newMeasure) => {
      // success
      vm.$log.debug('New computed measure: ', newMeasure);
      // merge project measure in array to preserve prepareMeasure arguments and already-set arguments
      const project_measure = _.find(vm.projectMeasures, {uid: measure.uid});
      _.merge(project_measure, newMeasure);

      //const index = _.indexOf(vm.projectMeasures, _.find(vm.projectMeasures, {uid: measure.uid}));
      //vm.projectMeasures.splice(index, 1, newMeasure);

      // unset 'update' status on original measure
      measure.status = '';

      deferred.resolve();
    }, () => {
      // failure
      //vm.$log.debug('Measure Manager computeArguments failed');
      deferred.reject();
    });

    return deferred.promise;
  }

  // copy from local and edit (2X)
  copyAndEditMeasure(measure) {
    const vm = this;
    vm.$log.debug('in COPY AND EDIT function');
    const deferred = vm.$q.defer();
    const modalInstance = vm.$uibModal.open({
      backdrop: 'static',
      controller: 'ModalDuplicateMeasureController',
      controllerAs: 'modal',
      templateUrl: 'app/bcl/duplicate_measure.html',
      windowClass: 'modal',
      resolve: {
        measure: function() {
          return measure;
        }
      }
    });

    modalInstance.result.then((params) => {
      vm.MeasureManager.duplicateMeasure(params).then( () => {
        // success
        vm.$log.debug('Measure Manager duplicateMeasure succeeded');
        vm.resetFilters();
        deferred.resolve();
      }, () => {
        // failure
        vm.$log.debug('Measure Manager duplicateMeasure failed');
        deferred.reject();
      } );
    }, () => {
      // Modal canceled
      vm.$log.debug('DuplicateMeasure Modal was canceled');
      deferred.reject();
    });

    return deferred.promise;
  }

  ok() {
    const vm = this;
    // save measures to project service (reconcile) before closing
    // vm.$log.debug('Updating Project Measures in Project Service');
    vm.$log.debug('Project Measures: ', vm.projectMeasures);
    // vm.Project.updateProjectMeasures(vm.projectMeasures);
    vm.$uibModalInstance.close();
  }

  search() {
    // TODO
  }

}
