// see http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file
// see http://stackoverflow.com/questions/18662404/download-lengthy-data-as-a-csv-file
var encodings = [
  "UTF-8", "IBM866", "ISO-8859-2", "ISO-8859-3", "ISO-8859-4", "ISO-8859-5",
  "ISO-8859-6", "ISO-8859-7", "ISO-8859-8", "ISO-8859-8-I", "ISO-8859-10",
  "ISO-8859-13", "ISO-8859-14", "ISO-8859-15", "ISO-8859-16", "KOI8-R",
  "KOI8-U", "macintosh", "windows-874", "windows-1250", "windows-1251",
  "windows-1252", "windows-1253", "windows-1254", "windows-1255",
  "windows-1256", "windows-1257", "windows-1258", "x-mac-cyrillic", "GBK",
  "gb18030", "Big5", "EUC-JP", "ISO-2022-JP", "Shift_JIS", "EUC-KR",
  "replacement", "UTF-16BE", "UTF-16LE", "x-user-defined"
]
var old_ynab_cols = ["Date", "Payee", "Memo", "Outflow", "Inflow"];
var new_ynab_cols = ["Date", "Payee", "Memo", "Amount", "Category", "Notes","Label"];

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
  ].join('');
};

angular.element(document).ready(function () {
  angular.module("app", []);
  angular.module("app").directive("fileread", [
    function () {
      return {
        scope: {
          fileread: "="
        },
        link: function (scope, element, attributes) {
          return element.bind("change", function (changeEvent) {
            var reader;
            reader = new FileReader();
            reader.onload = function (loadEvent) {
              return scope.$apply(function () {
                scope.fileread = loadEvent.target.result;
              });
            };
            reader.readAsText(changeEvent.target.files[0], attributes.encoding);
          });
        }
      };
    }
  ]);
  angular.module("app").directive("dropzone", [
    function () {
      return {
        transclude: true,
        replace: true,
        template: '<div class="dropzone"><div ng-transclude></div></div>',
        scope: {
          dropzone: "="
        },
        link: function (scope, element, attributes) {
          element.bind("dragenter", function (event) {
            element.addClass("dragging");
            event.preventDefault();
          });
          element.bind("dragover", function (event) {
            var efct;
            element.addClass("dragging");
            event.preventDefault();
            efct = event.dataTransfer.effectAllowed;
            event.dataTransfer.dropEffect =
              "move" === efct || "linkMove" === efct ? "move" : "copy";
          });
          element.bind("dragleave", function (event) {
            element.removeClass("dragging");
            event.preventDefault();
          });
          element.bind("drop", function (event) {
            var reader;
            element.removeClass("dragging");
            event.preventDefault();
            event.stopPropagation();
            reader = new FileReader();
            reader.onload = function (loadEvent) {
              scope.$apply(function () {
                scope.dropzone = loadEvent.target.result;
              });
            };
            reader.readAsText(event.dataTransfer.files[0], attributes.encoding);
          });
        }
      };
    }
  ]);
  // Application code
  angular.module("app").controller("ParseController", function ($scope) {
    $scope.angular_loaded = true;

    $scope.setInitialScopeState = function () {
      $scope.ynab_cols = JSON.parse(localStorage.getItem('columnFormat')) || old_ynab_cols;
      $scope.data = {};
      $scope.ynab_map = JSON.parse(localStorage.getItem('chosenColumns')) || $scope.ynab_cols.reduce(function (acc, val) {
        acc[val] = val;
        return acc;
      }, {});
      $scope.inverted_outflow = false;
      $scope.file = {
        encodings: encodings,
        chosenEncoding: localStorage.getItem('chosenEncoding') || "UTF-8"
      };
      $scope.data_object = new DataObject();
    }

    $scope.setInitialScopeState();
    $scope.encodingChosen = function (encoding) {
      localStorage.setItem('chosenEncoding', encoding);
    };
    $scope.toggleColumnFormat = function () {
      if ($scope.ynab_cols == new_ynab_cols) {
        $scope.ynab_cols = old_ynab_cols;
      } else {
        $scope.ynab_cols = new_ynab_cols;
      }
      localStorage.setItem('columnFormat', JSON.stringify($scope.ynab_cols));
    }

    $scope.$watch("data.source", function (newValue, oldValue) {
      if (newValue && newValue.length > 0) {
        $scope.data_object.parse_csv(newValue, $scope.file.chosenEncoding);
        $scope.preview = $scope.data_object.converted_json(10, $scope.ynab_cols, $scope.ynab_map, $scope.inverted_outflow);
      }
    });
    $scope.$watch("inverted_outflow", function (newValue, oldValue) {
      if (newValue != oldValue) {
        $scope.preview = $scope.data_object.converted_json(10, $scope.ynab_cols, $scope.ynab_map, $scope.inverted_outflow);
      }
    });
    $scope.$watch(
      "ynab_map",
      function (newValue, oldValue) {
        localStorage.setItem('chosenColumns', JSON.stringify(newValue));
        $scope.preview = $scope.data_object.converted_json(10, $scope.ynab_cols, newValue, $scope.inverted_outflow);
      },
      true
    );
    $scope.csvString = function () {
      return $scope.data_object.converted_csv(null, $scope.ynab_cols, $scope.ynab_map, $scope.inverted_outflow);
    };
    $scope.reloadApp = function () {
      $scope.setInitialScopeState();
    }
    $scope.invert_flows = function () {
      $scope.inverted_outflow = !$scope.inverted_outflow;
    }
    $scope.downloadFile = function () {
      var a;
      var date = new Date();
      a = document.createElement("a");
      a.href =
        "data:attachment/csv;base64," +
        btoa(unescape(encodeURIComponent($scope.csvString())));
      a.target = "_blank";
      a.download = `ynab_data_${date.yyyymmdd()}.csv`;
      document.body.appendChild(a);
      a.click();
    };
  });
  angular.bootstrap(document, ["app"]);
});
