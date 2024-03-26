sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageBox",
    "sap/m/Popover",
    "sap/m/Text",
    "sap/m/MessageToast",
    "sap/ui/core/syncStyleClass",
    "sap/ui/core/BusyIndicator"
  ],
  function (
    Controller,
    Dialog,
    Button,
    JSONModel,
    Filter,
    Fragment,
    FilterOperator,
    ODataModel,
    MessageBox,
    Popover,
    Text,
    MessageToast,
    syncStyleClass,
    BusyIndicator
  ) {
    "use strict";
    var updateStatus,
      updateLocation,
      selectedMaterial,
      latestTankDataMap = {},
      totalQuantity = 0,
      isError = false;

    return Controller.extend("tankreporting.controller.View1", {
      _oTankInfoDialog: null,
      _oDialog: null,
      oFragment: null,
      _oTankTableDialog: null,

      onInit: function () {
        var oModel = this.getOwnerComponent().getModel("tanks");

        var oTankLevel = this.getView().byId("container");
        var createModel = new JSONModel({
          Counter: "",
          DipDate: "",
          DipTime: "",
          SocEvent: "",
          testTemp: "",
          MatTemp: "",
          TestDens: "",
          Plant: "",
          StgeLoc: "",
          SeqNo: "",
          QuanLvc: "",
          QuanLvcUoM : "L",
          TotalheightFltp: "",
          uom1: "",
          uom2: "",
          uom3: "",
          waterHeight : "",
          waterHeightUoM : "CM",
          materialHeight : "",
          materialHeightUoM : "CM",
          waterQty : "",
          waterQtyUoM : "L",
          showMaterialQuantity: true, // Initially true if needed
          showMaterialHeight: false,
        });
        this.getView().setModel(createModel, "formData");

        // creating model for tank status
        var statusModel = new JSONModel({
          status: "",
          socnr: "",
        });
        this.getView().setModel(statusModel, "statusData");

        // creating table for tank 03Default
        var defaultModel = new JSONModel({
          temp: "",
          testdensity: "",
          testTemp: "",
          water_sediment: "",
          Matnr: "",
          Werks: "",
          Lgort: "",
          Datum: "",
          Time: "",
        });
        this.getView().setModel(defaultModel, "03_default");

        // creating table for select current and past date
        var dateModel = new JSONModel();
        var currentDate = new Date();
        dateModel.setData({
          currentDate: currentDate,
          currentTime: currentDate.toLocaleTimeString(),
        });
        this.getView().setModel(dateModel, "selectDate");

        // Get a reference to your dialog

        if (oModel) {
          var that = this;

          var tankPromise = new Promise(function (resolve, reject) {
            oModel.read("/Tank_MasterSet", {
              success: function (oData) {
                if (Array.isArray(oData.results)) {
                  console.table(oData.results)
                }
                that._tankData = oData.results;
                resolve();
              },
              error: function (oError) {
                console.error("Error reading Tank_MasterSet:", oError);
                reject(oError);
              },
            });
          });

          // Read Tank_MasterSet
          var tankPromise = new Promise(function (resolve, reject) {
            oModel.read("/Tank_MasterSet", {
              success: function (oData) {
                if (Array.isArray(oData.results)) {
                  // console.table(oData.results)
                }
                that._tankData = oData.results;
                resolve();
              },
              error: function (oError) {
                console.error("Error reading Tank_MasterSet:", oError);
                reject(oError);
              },
            });
          });

          // Read Stock_DipSet
          var stockDipPromise = new Promise(function (resolve, reject) {
            oModel.read("/Stock_DipSet", {
              success: function (oData) {
                if (Array.isArray(oData.results)) {
                  // console.table("stock_dip Data: ",oData.results)
                }
                that.stockDipData = oData.results;
                resolve();
              },
              error: function (error) {
                console.error("Error reading Stock_DipSet:", error);
                reject(error);
              },
            });
          });

          // Read soc_eventSet
          var SocEventPromise = new Promise(function (resolve, reject) {
            oModel.read("/Soc_eventSet", {
              success: function (data) {
                //  console.log("SocEvent Data loaded successfully:", data.results);
                that.SocEventSet = data.results;
                resolve();
              },
              error: function (error) {
                console.error("Error reading Stock_DipSet:", error);
                reject(error);
              },
            });
          });

          // Read system statusset
          var SystemStatusPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZTank_SValueHelp", {
              success: function (data) {
                that.systemStatus = data.results;
                resolve();
              },
              error: function (error) {
                console.error("Error reading Stock_DipSet:", error);
                reject(error);
              },
            });
          });

          var tankProductPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZTANK_PRODUCT_GROUPS", {
              // for creating unique product
              success: function (data) {
                var uniqueProductGroups = [];
                var productMap = {};
                // Iterate through the results to find unique product groups
                console.log("product are:",data.results);
                data.results.forEach(function (item) {
                  var productGroup = item.ProductGroup;
                  var material = item.MaterialCode;

                  if (!productMap[productGroup]) {
                    productMap[productGroup] = true;
                    uniqueProductGroups.push({
                      ProductGroup: productGroup,
                      MaterialCode: [material],
                    });
                  } else {
                    // If product group already exists, add material to its list
                    uniqueProductGroups.forEach(function (group) {
                      if (group.ProductGroup === productGroup) {
                        group.MaterialCode.push(material);
                      }
                    });
                  }
                });
                // Set the unique product groups to the view model
                that.tankProduct = uniqueProductGroups;
                resolve();
              },
              error: function (error) {
                console.error("Error reading tank Product:", error);
                reject(error);
              },
            });
          });

          // Read Tank master table
          var zTankMasterPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZMaster_tank", {
              success: function (data) {
                if (Array.isArray(data.results)) {
                  console.table(data.results);
                }
                that.masterSetData = data.results;
                resolve();
              },
              error: function (error) {
                console.error("Error loading Tank master:", error);
                reject(error);
              },
            });
          });

          var locationPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZTank_LocValueHelp", {
              success: function (data) {
                //  console.log("system Location Data loaded successfully:", data);
                that.location = data.results;
                resolve();
              },
              error: function (error) {
                console.error("Error reading Stock_DipSet:", error);
                reject(error);
              },
            });
          });

          var default04Promise = new Promise(function (resolve, reject) {
            oModel.read("/ZLATEST_DEFAULTS_F", {
              success: function (data) {
                // console.log(
                //   "default Location Data loaded successfully:",
                //   data.results
                // );
                that.maintainDefaultData = data.results;
                resolve();
              },
              error: function (error) {
                console.error("Error reading Stock_DipSet:", error);
                reject(error);
              },
            });
          });

          var tankDipPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZTankDip4", {
              success: function (data) {
                // console.log(
                //   "default Location Data loaded successfully:",
                //   data.results
                // );
                that.dipData = data.results;
                resolve();
              },
              error: function (error) {
                console.error("Error reading Stock_DipSet:", error);
                reject(error);
              },
            });
          });

          Promise.all([
            tankPromise,
            stockDipPromise,
            SocEventPromise,
            SystemStatusPromise,
            locationPromise,
            zTankMasterPromise,
            tankProductPromise,
            default04Promise,
            tankDipPromise
          ])
            .then(function () {
              var tankData = that.masterSetData;
              tankData.forEach(function (tank) {
                var socnr = tank.Socnr;
                var Etmstm = new Date(tank.Shorted);
                if (
                  !latestTankDataMap[socnr] ||
                  latestTankDataMap[socnr].Shorted < Etmstm
                ) {
                  latestTankDataMap[socnr] = tank;
                }
              });
              Object.values(latestTankDataMap).forEach(function (tank) {
                var quantity = parseFloat(tank.ADQNTP);
                if (!isNaN(quantity)) {
                  totalQuantity += quantity;
                } else {
                  console.error("Invalid quantity:", tank.QuanSku);
                }
              });

              

              totalQuantity = parseFloat(totalQuantity.toFixed(2)) + "L";
              var fullTankModel = new JSONModel({
                tankData: Object.values(latestTankDataMap),
                // tankData: that.masterSetData,
                status: that.systemStatus,
                product: that.tankProduct,
                totalQuantity: totalQuantity,
              });
              that.getView().setModel(fullTankModel, "tanks");
              // console.log("fullTankModel is"+JSON.stringify(that.getView().getModel("tanks").getData()));
              that.onDataLoaded();
              that.onPercentage();
            })
            .catch(function (error) {
              // console.error("Failed to load data:", error);
              isError = true;
            })
            .finally(function () {
              if (isError) {
                // MessageBox.error("Failed to load data")
              }
            });
        } else {
          MessageBox.error("Failed to load data");
        }

        //Error Model
        this.getOwnerComponent().setModel(
          new JSONModel({
            errorData: [],
          }),
          "errormodel"
        );
      },


      onChange: function (oEvent) {
        var oSelect = oEvent.getSource();
        var selectedItem = oSelect.getSelectedItem();
        var selectedText = selectedItem ? selectedItem.getText() : "";
        oSelect.setPlaceholder(selectedText);
      }, 

      // change handle code for datepicker
      selectDate: function (oEvent) {
        var oDateTimePicker = oEvent.getSource();
        var dipDate = oDateTimePicker.getDateValue();

        if (dipDate) {
          var formattedDate = this.formatDate(dipDate);
          var formattedTime = this.formatTime(dipDate);
          // Concatenate formatted date with "T00:00:00"
          var combinedDateTimeString = formattedDate + "T00:00:00";
          var combinedTimeString = formattedTime;

          var formDataModel = this.getView().getModel("formData");
          formDataModel.setProperty("/DipDate", combinedDateTimeString);
          formDataModel.setProperty("/DipTime", combinedTimeString);
        } else {
          console.error("Invalid Date");
        }
      },

      selectMaintainDate: function (oEvent) {
        var oDateTimePicker = oEvent.getSource();
        var dipDate = oDateTimePicker.getDateValue();

        if (dipDate) {
          var formattedDate = this.formatDate(dipDate);
          var formattedTime = this.formatTime(dipDate);
          // Concatenate formatted date with "T00:00:00"
          var combinedDateTimeString = formattedDate + "T00:00:00";
          var combinedTimeString = formattedTime;

          var formDataModel = this.getView().getModel("03_default");
          formDataModel.setProperty("/Datum", combinedDateTimeString);
          formDataModel.setProperty("/Time", combinedTimeString);
        } else {
          console.error("Invalid Date");
        }
      },

      formatDate: function (date) {
        return sap.ui.core.format.DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        }).format(date);
      },
    

      formatTime: function (date) {
        var inputTime = sap.ui.core.format.DateFormat.getTimeInstance({
          pattern: "HH:mm:ss",
        }).format(date);
        const [hours, minutes, seconds] = inputTime.split(":");

        // Create the ISO 8601 duration string
        const isoDuration = `PT${hours}H${minutes}M${seconds}S`;
        return isoDuration;
      },

      formatDensityText : function(value){
        var dipData = this.dipData.filter(function (item) {
          return item.socnr === value;
        }).map(function(item){
          return `${item.DensityQty} ${item.DensityUom}`
        })
        return dipData;
      },

      formatTestTempText:function(value){
        var dipData = this.dipData.filter(function (item) {
          return item.socnr === value;
        }).map(function(item){
          return `${item.TestTempQty} ${item.TestTempUom}`
        })
        return dipData;
      },
      formatMaterialTempText:function(value){
        var dipData = this.dipData.filter(function (item) {
          return item.socnr === value;
        }).map(function(item){
          return `${item.MaterialTempQty} ${item.MaterialTempUom}`
        })
        return dipData;
      },

      formatCombinedText:function(value){
        var dipData = this.dipData.filter(function (item) {
          return item.socnr === value;
        }).map(function(item){
         var testTempQty = parseFloat(item.TestTempQty).toFixed(2);
            var densityQty = parseFloat(item.DensityQty).toFixed(2);
            var materialTempQty = parseFloat(item.MaterialTempQty).toFixed(2);

            // Join the rounded numbers with '/'
            return `${testTempQty}/${densityQty}/${materialTempQty}`;
        })
        return dipData
      },

      formattotalQuantity: function(aItems) {
        let totalQuantity = 0;
        aItems.forEach(function(item) {
            totalQuantity += parseFloat(item.ADQNTP);
        });
        let tableTotalQuantity = this.formatStockText(totalQuantity)
        return "Total Quantity: " + tableTotalQuantity;
    },    

      // change label based on selected item in enter dip form
      onDipType: function (oEvent) {
        var selectedKey = oEvent.getSource().getSelectedKey();
        var selectedText = oEvent.getSource().getSelectedItem().getText();
        var oMaterialQty = this.getView().byId("hbox9");
        var oMaterialHeight = this.getView().byId("hbox7");
        if (
          selectedText === "Opening dip Height entry" ||
          selectedText === "Closing dip Height entry"
        ) {
          oMaterialQty.setVisible(false);
          oMaterialHeight.setVisible(true);
        } else {
          oMaterialQty.setVisible(true);
          oMaterialHeight.setVisible(false);
        }
        var formDataModel = this.getView().getModel("formData");
        formDataModel.setProperty("/SocEvent", selectedKey);
      },

      onDipType: function (oEvent) {
        var selectedText = oEvent.getSource().getSelectedItem().getText();
        var formDataModel = this.getView().getModel("formData");

        if (
          selectedText === "Opening dip Height entry" ||
          selectedText === "Closing dip Height entry"
        ) {
          formDataModel.setProperty("/showMaterialQuantity", false);
          formDataModel.setProperty("/showMaterialHeight", true);
        } else {
          formDataModel.setProperty("/showMaterialQuantity", true);
          formDataModel.setProperty("/showMaterialHeight", false);
        }

        var selectedKey = oEvent.getSource().getSelectedKey();
        formDataModel.setProperty("/SocEvent", selectedKey);
      },

      onProductFilter: function (oEvent) {
        var oValidatedComboBox = oEvent.getSource(),
            sSelectedKey = oValidatedComboBox.getSelectedKey(),
            selectedMaterial = oValidatedComboBox.getValue();
        var productValue = this.getView().byId("filterDropdown3");
        productValue.setValue("");
    
        var oMaterialsModel = this.getView().getModel("tanks");
        var aFilteredProduct = oMaterialsModel
            .getProperty("/product")
            .filter(function (product) {
                return product.ProductGroup === selectedMaterial;
            });
    
        var extractedProperties = aFilteredProduct.map(function (product) {
            return {
                Material: product.MaterialCode,
            };
        });
        var tankSeqNo = extractedProperties[0].Material[0];
        var materialNo = this.masterSetData.filter(function (item) {
            return (
                item.Matnr === tankSeqNo ||
                item.Matnr === extractedProperties[0].Material[1]
            );
        });
        var sModel = new JSONModel(materialNo);
        this.getView().setModel(sModel, "tankSeqFilterModel");
    
        var mModel = new JSONModel(extractedProperties[0].Material);
        this.getView().setModel(mModel, "materialFilter");
        // Calculate total quantity
        var totalQuantity = materialNo.reduce(function (total, tank) {
            return total + parseFloat(tank.ADQNTP || 0);
        }, 0);
    
        // Update total quantity text
        var formattedTotalQuantity = this.formatStockText(totalQuantity);
        
        var totalQuantityText = this.byId("total_calculated");
        totalQuantityText.setText(`${formattedTotalQuantity} L`);    
        this.onFilterGoPressed();
    },
    
    


      // product filter code
      onroductFilter: function (oEvent) {
        var oValidatedComboBox = oEvent.getSource(),
          sSelectedKey = oValidatedComboBox.getSelectedKey(),
          selectedMaterial = oValidatedComboBox.getValue();

        var productValue = this.getView().byId("filterDropdown3");
        productValue.setValue("");

        var oMaterialsModel = this.getView().getModel("tanks");
        var aFilteredProduct = oMaterialsModel
          .getProperty("/product")
          .filter(function (product) {
            return product.ProductGroup === selectedMaterial;
          });

        var extractedProperties = aFilteredProduct.map(function (product) {
          return {
            Material: product.MaterialCode,
          };
        });
        var tankSeqNo = extractedProperties[0].Material[0];
        var materialNo = this.masterSetData.filter(function (item) {
          // return item.Matnr===tankSeqNo;
          return (
            item.Matnr === tankSeqNo ||
            item.Matnr === extractedProperties[0].Material[1]
          );
        });
        var sModel = new JSONModel(materialNo);
        this.getView().setModel(sModel, "tankSeqFilterModel");

        var mModel = new JSONModel(extractedProperties[0].Material);
        this.getView().setModel(mModel, "materialFilter");
        this.onFilterGoPressed();
      },

      // onankSeqFilter: function (oEvent) {
      //   var selectedProduct = this.getView().byId("filterDropdown3").getValue();
      //   var selectedMaterial = this.getView()
      //     .byId("filterDropdown4")
      //     .getValue();
      //   var combobox = this.getView().byId("filterDropdown4");

      //   // Check if a product is selected
      //   if (!selectedProduct) {
      //     // If no product is selected, load all Lgort values for tanks
      //     var allLgorts = this.masterSetData
      //       .map(function (item) {
      //         return { Lgort: item.Lgort }; // Convert each Lgort value into an object
      //       })
      //       .filter(function (value, index, self) {
      //         return self.findIndex((v) => v.Lgort === value.Lgort) === index; // Remove duplicate objects
      //       });

      //     var allLgortModel = new sap.ui.model.json.JSONModel(allLgorts);
      //     this.getView().setModel(allLgortModel, "tankSeqFilterModel");

      //     // Open the dropdown list of the combobox
      //     combobox.open();
      //   } else {
      //     // If a product is selected, filter Lgort values based on the selected product
      //     var filteredLgorts = this.masterSetData
      //       .filter(function (item) {
      //         return item.Matnr === selectedMaterial;
      //       })
      //       .map(function (item) {
      //         return { Lgort: item.Lgort }; // Convert each Lgort value into an object
      //       })
      //       .filter(function (value, index, self) {
      //         return self.findIndex((v) => v.Lgort === value.Lgort) === index; // Remove duplicate objects
      //       });

      //     var filteredLgortModel = new sap.ui.model.json.JSONModel(
      //       filteredLgorts
      //     );
      //     this.getView().setModel(filteredLgortModel, "tankSeqFilterModel");
      //   }
      // },


      onTankSeqFilter: function (oEvent) {
        // debugger;
        var oValidatedComboBox = oEvent.getSource(),
          sSelectedTank = oValidatedComboBox.getSelectedKey();
        if (!sSelectedTank) {
          var filterData = this.masterSetData.filter(function (item) {
            return item.Lgort;
          });

          var tankSeqFilterModel = new JSONModel(filterData);
         this.getView().setModel(tankSeqFilterModel, "tankSeqFilterModel");
         console.log("ajdjfliuwaftla",this.getView().getModel("tankSeqFilterModel").getData());          
          console.log("filter tank data", filterData);
        } else {
          var oTank = this.masterSetData.filter(function (item) {
            return item.Lgort === sSelectedTank;
          });

          var matchingTankData =
            this.stockDipData
              .filter(function (tankItem) {
                return tankItem.Socnr === oTank[0].Socnr;
              })
              .sort(function (a, b) {
                return parseInt(b.Etmstm) - parseInt(a.Etmstm);
              })[0] || null;

          var matnrProduct = this.tankProduct.filter(function (item) {
            return item.MaterialCode.includes(oTank[0].Matnr);
          });

          var DefData = this.maintainDefaultData.filter(function (item) {
            return item.Lgort === oTank[0].Lgort;
          });

          if (matchingTankData) {
            var combinedData = {
              tankData: matchingTankData,
              selectedTank: oTank[0],
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location,
              product: matnrProduct[0],
              oDefault: DefData.length ? DefData[0] : null,
            };
            console.log("combined data :", combinedData);
            if (combinedData.oDefault) {
              this.openTankDetailsDialog(combinedData, oTank[0].Matnr);
            } else {
              // If default data doesn't exist, set default values to empty
              combinedData.oDefault = {
                MaterialTempQty: "",
                MaterialTempUom: "",
                DensityQty: "",
                DensityUom: "",
                TestTempQty: "",
                TestTempUom: "",
              };
              this.openTankDetailsDialog(combinedData, oTank[0].Matnr);
            }
          } else {
            var tankDataOnly = {
              selectedTank: oTank,
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location,
              product: matnrProduct[0],
              oDefault: DefData.length ? DefData[0] : null,
            };
            if (!tankDataOnly.oDefault) {
              // If default data doesn't exist, set default values to empty
              tankDataOnly.oDefault = {
                MaterialTempQty: "",
                MaterialTempUom: "",
                DensityQty: "",
                DensityUom: "",
                TestTempQty: "",
                TestTempUom: "",
              };
            }
            this.openTankDetailsDialog(tankDataOnly, oTank[0].Matnr);
          }
        }
      },
    

      onSuggestTankSeq: function (oEvent) {
        var sValue = oEvent.getParameter("suggestValue");
        var aFilters = [];
        if (sValue) {
            aFilters.push(new Filter("Lgort", sap.ui.model.FilterOperator.Contains, sValue));
        }
    
        var oComboBox = oEvent.getSource();
        oComboBox.getBinding("items").filter(aFilters);
    },    

      // on filter with Material code through change handler on combobox
      onMterialFilter: function (oEvent) {
        var oValidatedComboBox = oEvent.getSource(),
          sSelectedKey = oValidatedComboBox.getSelectedKey(),
          selectedMaterial = oValidatedComboBox.getValue();
        console.log("material no is", selectedMaterial, latestTankDataMap);

        var latestTankDataArray = Object.values(latestTankDataMap);
        var filterTankMatnr = latestTankDataArray.filter(function (tank) {
          return tank.Matnr === selectedMaterial;
        });

        var oFlexBox = this.getView().byId("tank_layout");
        var oModel = new JSONModel({
          tankData: filterTankMatnr,
        });
        oFlexBox.setModel(oModel, "tanks");
        console.log("selected matnr tank is", filterTankMatnr);
      },

      onFilterRefreshPressed: function () {
        this.showAllTanks();
      },

      // write code for Go filter Button code
      // onFilterGoPressed: function () {

      //   var productItem = this.byId("filterDropdown2").getValue();
      //   var materialItem = this.byId("filterDropdown3").getValue();

      //   if (!productItem) {
      //     MessageBox.error("Please Select Product");
      //   } else {
      //     var selectedItem = this.byId("filterDropdown3");
      //     var selectedMatnr = selectedItem.getValue();
      //     console.log("this.latesttankdatamap",latestTankDataMap);
      //     var latestTankDataArray = Object.values(latestTankDataMap);
      //     var filterTankMatnr = latestTankDataArray.filter(function (tank) {
      //       return tank.Matnr === selectedMatnr;
      //     });

      //     if (filterTankMatnr.length === 0) {
      //       var that = this;
      //       MessageBox.error(`No tanks found for selected Product: ${selectedMatnr}`, {
      //         onClose: function (oAction) {
      //           if (oAction === MessageBox.Action.CLOSE) {
      //             that.showAllTanks();
      //           }
      //         }
      //       });
      //       return;
      //     }

      //     var totalQuantity = filterTankMatnr.reduce(function (total, tank) {
      //       return total + parseFloat(tank.ADQNTP || 0);
      //     }, 0);

      //     var oFlexBox = this.getView().byId("tank_layout");
      //     var oModel = new JSONModel({
      //       tankData: filterTankMatnr,
      //       totalQuantity: totalQuantity
      //     });
      //     oFlexBox.setModel(oModel, "tanks");

      //     var totalQuantityText = this.byId("total_calculated");
      //     totalQuantityText.setText(`${totalQuantity.toString()} L`);
      //     this.onDataLoaded()
      //   }
      // },

      onFilterGoPressed: function () {
        var productItem = this.byId("filterDropdown2").getValue();
        if (!productItem) {
          MessageBox.error("Please Select Product");
          return;
        }

        // Filter tankProduct data based on the selected product
        var selectedItem = this.byId("filterDropdown2");
        var selectedProductGroup = selectedItem.getValue();
        var productData = this.tankProduct.filter(function (item) {
          return item.ProductGroup === selectedProductGroup;
        });

        // Extract material numbers associated with the selected product
        var materialNumbers = productData.reduce(function (acc, item) {
          return acc.concat(item.MaterialCode || []);
        }, []);

        // Filter latestTankDataArray based on the extracted material numbers
        var filterTankMatnr = this.masterSetData.filter(function (tank) {
          return materialNumbers.includes(tank.Matnr);
        });

        if (filterTankMatnr.length === 0) {
          var that = this;
          MessageBox.error(
            `No tanks found for selected Product: ${selectedProductGroup}`,
            {
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.CLOSE) {
                  that.showAllTanks();
                }
              },
            }
          );
          return;
        }

        // Calculate total quantity
        // var totalQuantity = filterTankMatnr.reduce(function (total, tank) {
        //   return total + parseFloat(tank.ADQNTP || 0);
        // }, 0);

        // Set model and update total quantity
        var oFlexBox = this.getView().byId("tank_layout");
        var oModel = new JSONModel({
          tankData: filterTankMatnr, 
          // totalQuantity: totalQuantity,
        });
        oFlexBox.setModel(oModel, "tanks");

        // var totalQuantityText = this.byId("total_calculated");
        // totalQuantityText.setText(`${totalQuantity.toString()} L`);

        this.onDataLoaded();
      },

      // write code for showing all tanks
      showAllTanks: function () {
        // this.onTankSeqFilter()
        // var sFilter = this.getView().byId("filterDropdown4").setValue("")
        var latestTankDataArray = Object.values(latestTankDataMap);
        var totalQuantity = latestTankDataArray.reduce(function (total, tank) {
          return total + parseFloat(tank.ADQNTP || 0);
        }, 0);

        var formattedTotalQuantity = this.formatStockText(totalQuantity);

        var oFlexBox = this.getView().byId("tank_layout");
        var oModel = new JSONModel({
          tankData: latestTankDataArray,
          // totalQuantity: totalQuantity,
        });
        oFlexBox.setModel(oModel, "tanks");

        var totalQuantityText = this.byId("total_calculated");
        totalQuantityText.setText(`${formattedTotalQuantity} L`);

        var filterDropdown1 = this.byId("filterDropdown2");
        var filterDropdown2 = this.byId("filterDropdown3");
        if (filterDropdown1 || filterDropdown2) {
          filterDropdown1.setValue("");
          filterDropdown2.setValue("");
        }
        this.onDataLoaded();
      },

      // write code for input validation for volume
      onLiveChangeOnVolume: function (oEvent) {
        var tankDetailsModel = this._oDialog.getModel("tankDetails");
        var maxCapacity = parseFloat(
          tankDetailsModel.getProperty("/selectedTank/Kapaz")
        );

        var input = oEvent.getSource();
        var value = input.getValue();
        var numberPattern = /^\d*\.?\d*$/;
        var isValid = numberPattern.test(value);
        var submitButton = sap.ui.getCore().byId("_IDGenButton2");

        // If the entered value is not a number, or exceeds the maximum capacity, display an error message and disable the submit button
        if (!isValid || parseFloat(value) > maxCapacity) {
          input.setValueState("Error");
          input.setValueStateText(
            parseFloat(value) > maxCapacity
              ? "Entered value exceeds maximum capacity"
              : "Please enter a valid number"
          );
          submitButton.setEnabled(false);
        } else {
          // If the entered value is valid, clear the error state and enable the submit button
          input.setValueState("None");
          input.setValueStateText("");
          submitButton.setEnabled(true);
        }
      },

      // to check validation to enter the UOM
      // onLiveChangeOnUom: function (oEvent) {
      //   var input = oEvent.getSource();
      //   var value = input.getValue();
      //   var submitButton = sap.ui.getCore().byId("_IDGenButton2");

      //   // Regular expression to match alphabetic values
      //   var stringPattern = /^[a-zA-Z]+$/;

      //   // Check if the entered value contains only alphabetic characters
      //   var isValid = stringPattern.test(value);

      //   // If the entered value is not a string, display an error message and disable the submit button
      //   if (!isValid) {
      //     input.setValueState("Error");
      //     input.setValueStateText("Please enter a valid string");
      //     submitButton.setEnabled(false);
      //   } else {
      //     // If the entered value is valid, clear the error state and enable the submit button
      //     input.setValueState("None");
      //     input.setValueStateText("");
      //     submitButton.setEnabled(true);
      //   }
      // },
    //   onLiveChangeOnUom: function (oEvent) {
    //     var input = oEvent.getSource();
    //     var value = input.getValue();
    //     var submitButton = sap.ui.getCore().byId("_IDGenButton2");
    
    //     // Regular expression to match alphabetic values
    //     var stringPattern = /^[a-zA-Z]+$/;
    
    //     // Check if the entered value contains only alphabetic characters
    //     var isValid = stringPattern.test(value);
    
    //     // If the entered value is not a string, display an error message and disable the submit button
    //     if (!isValid) {
    //       input.setValueState("Error");
    //       input.setValueStateText("Please enter a valid string");
    //       submitButton.setEnabled(false);
    //     } else {
    //       // If the entered value is valid, clear the error state and enable the submit button
    //       input.setValueState("None");
    //       input.setValueStateText("");
    //       submitButton.setEnabled(true);
    
    //       // Set focus to the next input field
    //       var nextInputFieldId = "idOfNextInputField"; // Replace this with the ID of the next input field
    //       var nextInputField = sap.ui.getCore().byId(nextInputFieldId);
    //       if (nextInputField) {
    //           nextInputField.focus();
    //       }
    //     }
    // },

    onLiveChangeOnUom: function (oEvent) {
      var input = oEvent.getSource();
      var value = input.getValue();
      var submitButton = sap.ui.getCore().byId("_IDGenButton2");
  
      // Regular expression to match alphabetic values
      var stringPattern = /^[a-zA-Z]+$/;
  
      // Check if the entered value contains only alphabetic characters
      var isValid = stringPattern.test(value);
  
      // If the entered value is not a string, display an error message and disable the submit button
      if (!isValid) {
        input.setValueState("Error");
        input.setValueStateText("Please enter a valid string");
        submitButton.setEnabled(false);
      } else {
        // If the entered value is valid, clear the error state and enable the submit button
        input.setValueState("None");
        input.setValueStateText("");
        submitButton.setEnabled(true);
      }
  
      // Remove focus from the input field if the entered value is not valid
      if (!isValid) {
          input.blur();
      }
  },

  onLiveChangeWaternSediment: function (oEvent) {
    var input = oEvent.getSource();
    var value = parseFloat(input.getValue());
    var submitButton = sap.ui.getCore().byId("_IDGenButton2");

    // Check if the entered value is less than or equal to 1
    if (isNaN(value) || value > 1) {
        input.setValueState("Error");
        input.setValueStateText("Value must be less than or equal to 1");
        submitButton.setEnabled(false);
    } else {
        input.setValueState("None");
        input.setValueStateText("");
        submitButton.setEnabled(true);
    }
},
  
    
         

      // for validation check when enter the value in input box
      onLiveChange: function (oEvent) {
        var input = oEvent.getSource();
        var value = input.getValue();
        var submitButton = sap.ui.getCore().byId("_IDGenButton2");
        var numberPattern = /^\d*\.?\d*$/;
        var isValid = numberPattern.test(value);
        if (!isValid) {
          input.setValueState("Error");
          input.setValueStateText("Please enter a valid number");
          submitButton.setEnabled(false);
        } else {
          input.setValueState("None");
          input.setValueStateText("");
          submitButton.setEnabled(true);
        }
      },

      // write code for Submit dip for tank inside details fragment

      onSubmitPress: function (oEvent) {
        let that = this;
        var CreateDipHeader = this.getView().getModel("formData");
        var tankDetailsModel = this._oDialog.getModel("tankDetails");
        var QuanSku = tankDetailsModel.getProperty("/selectedTank/ADQNTP");
        var dipDate = CreateDipHeader.getProperty("/DipDate");
        var dipTime = CreateDipHeader.getProperty("/DipTime");
        var socEvent = CreateDipHeader.getProperty("/SocEvent");
        var plant = tankDetailsModel.getProperty("/selectedTank/Werks");
        var Soc_no = tankDetailsModel.getProperty("/selectedTank/Seqnr");
        var StorageLoc = tankDetailsModel.getProperty("/selectedTank/Lgort");
        var matnrHeight = sap.ui.getCore().byId("matnrHeight").getValue();
        var matnrHeightUoM = sap.ui.getCore().byId("matnrHeightUoM").getValue();
        var waterHeight = sap.ui.getCore().byId("waterHeight").getValue();
        var waterHeightUoM = sap.ui.getCore().byId("waterHeightUoM").getValue();
        var volume = sap.ui.getCore().byId("matnrQty").getValue();
        var volumeUoM = sap.ui.getCore().byId("matrQtyUomInput").getValue();
        var matTemp = sap.ui.getCore().byId("material_temp").getValue();
        var matTempUoM = sap.ui.getCore().byId("uom_input").getValue();
        var testDens = sap.ui.getCore().byId("testDens_input").getValue();
        var testDensUom = sap.ui.getCore().byId("densUom_input").getValue();
        var testTemp = sap.ui.getCore().byId("testTemps_input").getValue();
        var testTempUom = sap.ui.getCore().byId("testTempUom_input").getValue();
        var waterQty = sap.ui.getCore().byId("waterQty").getValue();
        var waterQtytUoM = sap.ui.getCore().byId("waterQtyUomInput").getValue();
        var matQty = sap.ui.getCore().byId("matnrQty").getValue();

        if (!dipDate) {
          MessageBox.error("Please select a date before Dip posting!!");
          return; // Exit the function if date is not selected
      }

        // Set entire data object at once
        CreateDipHeader.setData({
          QuanLvc: matQty,
          QuanLvcUoM :volumeUoM ,
          Plant: plant,
          SeqNo: Soc_no,
          StgeLoc: StorageLoc,
          MatTemp: matTemp,
          TestDens: testDens,
          testTemp: testTemp,
          uom1: matTempUoM,
          uom2: testDensUom,
          uom3: testTempUom,
          DipDate: dipDate,
          DipTime: dipTime,
          SocEvent: socEvent,
          waterHeight : waterHeight,
          waterHeightUoM : waterHeightUoM,
          materialHeight : matnrHeight,
          materialHeightUoM : matnrHeightUoM,
          waterQty : waterQty,
          waterQtyUoM : waterQtytUoM,
          showMaterialQuantity: CreateDipHeader.getProperty(
            "/showMaterialQuantity"
          ),
          showMaterialHeight: CreateDipHeader.getProperty(
            "/showMaterialHeight"
          ),
        });

        var data = CreateDipHeader.getData();
        var oModel = this.getOwnerComponent().getModel("tanks");

        // Create payload and proceed with the request
        var oPayload = {
          Counter: "003",
          CreateDipNav01: [
            {
              Counter: "003",
              Plant: data.Plant,
              StgeLoc: data.StgeLoc,
              SeqNo: data.SeqNo,
              DipDate: data.DipDate,
              DipTime: data.DipTime,
              SocEvent: data.SocEvent,
              TvolUom: data.QuanLvcUoM || "L",
              WaterheightFltp: data.waterHeight || "0",
              WathUom: data.waterHeightUoM || "",
              TotalheightFltp: data.materialHeight || "0",
              TothUom: data.materialHeightUoM || "",
              WatrLvc : data.waterQty || "0",
              WvolUom : data.waterQtyUoM || ""
            },
          ],
          CreateDipNav02: [
            {
              Counter: "003",
              TestTemp: data.testTemp || "0",
              TestTempUom: data.uom1 || "",
              MatTemp: data.MatTemp || "0",
              MatTempUom: data.uom3 || "",
              TestDens: data.TestDens || "0",
              TestDensUom: data.uom2 || "",
              Bsw:"1",
              BswUom:"V%"

            },
          ],
        };

        if (data.QuanLvc.trim() !== "") {
          oPayload.CreateDipNav01[0].QuanLvc = data.QuanLvc;
         }
         else{
          oPayload.CreateDipNav01[0].QuanLvc = QuanSku;
         }
      BusyIndicator.show();
        // console.log("payload data is :", oPayload);
        oModel.create("/CreateDipSet", oPayload, {
          
          success: function(odata, oResponse){
            setTimeout(function() {
              BusyIndicator.hide();        
              MessageBox.success("Dip Post Successfully!!", {}); 
              oModel.refresh();       
              CreateDipHeader.setData({
                Counter: "",
                DipDate: "",
                DipTime: "",
                SocEvent: "",
                Plant: "",
                StgeLoc: "",
                SeqNo: "",
                waterHeight : "",
                waterHeightUoM : "CM",
                materialHeight : "",
                materialHeightUoM : "CM",
                waterQty : "",
                waterQtyUoM : "L",
                QuanLvc : "",
                QuanLvcUoM : "L",
                showMaterialQuantity: true,
                showMaterialHeight: false,
              });
            }, 1000); 
          },
          error: function (error) {
            console.error("Error encountered:", error);
            CreateDipHeader.setData({
                showMaterialQuantity: true,
                showMaterialHeight: false,
            });
        
            // Hide busy indicator after 1 second
            setTimeout(function() {
                BusyIndicator.hide();
        
                if (error.response) {
                    console.error("Response:", error.response);
                    if (error.statusCode === 404) {
                        MessageBox.error("Resource not found. Please try again later.");
                    } else {
                        MessageBox.error(
                            "An unexpected error occurred. Please try again later."
                        );
                    }
                } else if (error.responseText) {
                    try {
                        let parsedResponseText;
                        try {
                            parsedResponseText = JSON.parse(error.responseText);
                        } catch (error) {
                            parsedResponseText = error.responseText;
                        }
                        if (parsedResponseText) {
                            if (parsedResponseText?.error?.innererror?.errordetails?.length) {
                                that.getOwnerComponent()
                                    .getModel("errormodel")
                                    .getData().errorData =
                                    parsedResponseText?.error?.innererror?.errordetails;
                                that.getOwnerComponent().getModel("errormodel").refresh();
                                that.showBapiError();
                            } else if (parsedResponseText?.error?.message?.value) {
                                let errorMessage =
                                    parsedResponseText.error.message.value;
                                MessageBox.error(errorMessage);
                            } else {
                                let errorMessage2 = parsedResponseText;
                                MessageBox.error(errorMessage2);
                            }
                        }
                    } catch (err) {
                        console.error("Error parsing response text:", err);
                    }
                } else {
                    // Handle other types of errors
                    MessageBox.error(
                        "An unexpected error occurred. Please try again later."
                    );
                }
            }, 1000);
        },
        
        });
      },  

      handleBapiError: function (aError) {
        let errorDetails = aError
          .map((error) => {
            return `${error.ContentID}: ${error.code} - ${error.message}`;
          })
          .join("\n");

        MessageBox.error(errorDetails, {
          title: "Error Details",
        });
      },

      onRefreshData: function () {
        location.reload(true);
      },

      // write code for maintain default for posting data
      onUpdateDefault: function () {
        var that = this;
        var defaultData = this.getView().getModel("03_default");
        var tankDetailsModel = this._oDialog.getModel("tankDetails");
        var vMatnr = tankDetailsModel.getProperty("/selectedTank/Matnr");
        var vWerks = tankDetailsModel.getProperty("/selectedTank/Werks");
        var vLgort = tankDetailsModel.getProperty("/selectedTank/Lgort");
        var defaultTempUom = sap.ui.getCore().byId("defuom_input").getValue();
        var defaultTemp = sap.ui.getCore().byId("temp_input").getValue();
        var defaultDensUom = sap.ui.getCore().byId("defdensuom_input").getValue();
        var defaultDens = sap.ui.getCore().byId("defDensity_input").getValue();
        var defaultTestTempUom = sap.ui.getCore().byId("defTestTempuom_input").getValue();
        var defaultTestTemp = sap.ui.getCore().byId("def_input").getValue();
        defaultData.setProperty("/Matnr", vMatnr);
        defaultData.setProperty("/Werks", vWerks);
        defaultData.setProperty("/Lgort", vLgort);
        var default_data = defaultData.getData();
        var oModel = this.getOwnerComponent().getModel("tanks");
    
        var oPayload = {
            Matnr: default_data.Matnr,
            Werks: default_data.Werks,
            Lgort: default_data.Lgort,
            Datum: default_data.Datum,
            Time: default_data.Time,
            Aktid: "2",
            Timestamp: "",
            UTrtyp: "H",
            OIBIndexNav: [
                {
                    ParName: "OBSMTMETTP",
                    ParFltp: defaultTemp || "0",
                    ParChar: "",
                    UnitChar: defaultTempUom || "",
                    ParLength: "00",
                    Item: "000",
                    UTrtyp: "H",
                },
                {
                    ParName: "OBSTSTDENS",
                    ParFltp: defaultDens || "0",
                    ParChar: "",
                    UnitChar: defaultDensUom || "",
                    ParLength: "00",
                    Item: "000",
                    UTrtyp: "H",
                },
                {
                    ParName: "OBSTSTMETT",
                    ParFltp: defaultTestTemp || "0",
                    ParChar: "",
                    UnitChar: defaultTestTempUom || "",
                    ParLength: "00",
                    Item: "000",
                    UTrtyp: "H",
                },
                {
                    ParName: "BSWCN ",
                    ParFltp: default_data.water_sediment || "0",
                    ParChar: "",
                    UnitChar: "V%",
                    ParLength: "00",
                    Item: "000",
                    UTrtyp: "H",
                },
            ],
        };
        BusyIndicator.show();
        oModel.create("/O3updateINSet", oPayload, {
            success: function (oData, response) {
              setTimeout(function(){
                BusyIndicator.hide(); 
              
                MessageBox.success("O3Default created successfully!!");
                defaultData.setData({
                    temp: "",
                    density: "",
                    test_temp: "",
                    water_sediment: "",
                    Matnr: "",
                    Werks: "",
                    Lgort: "",
                    Datum: "",
                    Time: "",
                });
              },1000)
            },
            error: function (error) {
                if (error.response) {
                    console.error("Response: ", error.responseText);
                }
                if (error?.responseText) {
                    if (error.response) {
                        console.error("Response: ", error.response);
                    }
                    if (error?.responseText) {
                        try {
                            let parsedResponseText = JSON.parse(error.responseText);
                            if (
                                parsedResponseText &&
                                parsedResponseText.error &&
                                parsedResponseText.error.message
                            ) {
                                let errorMessage = parsedResponseText.error.message.value;
                                MessageBox.error(errorMessage);
                                // You can use the errorMessage as needed
                            }
                        } catch (err) {
                            console.error("Error parsing response text:", err);
                        }
                    }
                }
                // Hide busy indicator after handling the error
                BusyIndicator.hide();
            },
        });
    },
    

      // create a function to convert date into timestamp format
      getCurrentDateTime: function () {
        var currentDateTime = new Date();
        var formattedDate = this.formatDate(currentDateTime);
        var formattedTime = this.formatTime(currentDateTime);
        var combinedDateTimeString = formattedDate + "T00:00:00";
        return {
          date: combinedDateTimeString,
          time: formattedTime,
        };
      },

      // bind details of a particular tank that is clicked
      // onShowInfoPress: function (oEvent) {
      //   // debugger;
      //   var oButton = oEvent.getSource();
      //   var oBindingContext = oButton.getBindingContext("tanks");
      //   if (oBindingContext) {
      //     var oTank = oBindingContext.getObject();
      //     var selectedTankSocnr = oTank.Socnr;
      //     var selectMatnr = oTank.Matnr;
      //     var selectLgort = oTank.Lgort
      //     var matchingTankData = this.stockDipData.filter(function (tankItem) {
      //       return tankItem.Socnr === selectedTankSocnr;
      //     }).
      //       sort(function (a, b) {
      //         return parseInt(b.Etmstm) - parseInt(a.Etmstm);
      //       })[0] || null;

      //       var matnrProduct = this.tankProduct.filter(function(item){
      //         return item.MaterialCode.includes(selectMatnr);
      //       })

      //       var DefData =  this.maintainDefaultData.filter(function(item){
      //         return  item.Lgort === selectLgort
      //       })

      //     if (matchingTankData) {
      //       var combinedData = {
      //         tankData: matchingTankData,
      //         selectedTank: oTank,
      //         socEvent: this.SocEventSet,
      //         status: this.systemStatus,
      //         location: this.location,
      //         product:matnrProduct[0],
      //         oDefault : DefData.length ? DefData[0] : null,
      //       };
      //       console.log("combined data :",combinedData);
      //       this.openTankDetailsDialog(combinedData, oTank.Matnr);
      //     } else {
      //       var tankDataOnly = {
      //         selectedTank: oTank,
      //         socEvent: this.SocEventSet,
      //         status: this.systemStatus,
      //         location: this.location,
      //         product:matnrProduct[0],
      //         oDefault : DefData.length ? DefData[0] : null,
      //       };
      //       this.openTankDetailsDialog(tankDataOnly, oTank.Matnr);
      //     }
      //   } else {
      //     console.error("Binding context is undefined.");
      //   }
      // },
      onShowInfoPress: function (oEvent) {
        var oButton = oEvent.getSource();
        var oBindingContext = oButton.getBindingContext("tanks");
        if (oBindingContext) {
          var oTank = oBindingContext.getObject();
          var selectedTankSocnr = oTank.Socnr;
          var selectMatnr = oTank.Matnr;
          var selectLgort = oTank.Lgort;

          var matchingTankData =
            this.stockDipData
              .filter(function (tankItem) {
                return tankItem.Socnr === selectedTankSocnr;
              })
              .sort(function (a, b) {
                return parseInt(b.Etmstm) - parseInt(a.Etmstm);
              })[0] || null;

          var matnrProduct = this.tankProduct.filter(function (item) {
            return item.MaterialCode.includes(selectMatnr);
          });

          var DefData = this.maintainDefaultData.filter(function (item) {
            return item.Lgort === selectLgort;
          });
          // debugger;

          var dipData = this.dipData.filter(function (item) {
            return item.socnr === selectedTankSocnr;
          });

          if (matchingTankData) {
            var combinedData = {
              tankData: matchingTankData,
              selectedTank: oTank,
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location,
              product: matnrProduct[0],
              oDefault: DefData.length ? DefData[0] : null,
              dipData : dipData.length ? dipData[0] : null,
             
            };
            console.log("combined data :", combinedData);
            if (combinedData.oDefault) {
              this.openTankDetailsDialog(combinedData, oTank.Matnr);
            } else {
              // If default data doesn't exist, set default values to empty
              combinedData.oDefault = {
                MaterialTempQty: "",
                MaterialTempUom: "",
                DensityQty: "",
                DensityUom: "",
                TestTempQty: "",
                TestTempUom: "",
              };
              this.openTankDetailsDialog(combinedData, oTank.Matnr);
            }
          } else {
            var tankDataOnly = {
              selectedTank: oTank,
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location,
              product: matnrProduct[0],
              oDefault: DefData.length ? DefData[0] : null,
            };
            if (!tankDataOnly.oDefault) {
              // If default data doesn't exist, set default values to empty
              tankDataOnly.oDefault = {
                MaterialTempQty: "",
                MaterialTempUom: "",
                DensityQty: "",
                DensityUom: "",
                TestTempQty: "",
                TestTempUom: "",
              };
            }
            this.openTankDetailsDialog(tankDataOnly, oTank.Matnr);
          }
        } else {
          console.error("Binding context is undefined.");
        }
      },

      //write code for show all tanks in Table
      onShowAllTanksTable: function () {
        this.onOpenTanksTableDialog();
      },

      onOpenTanksTableDialog: function () {
        if (!this._oTankTableDialog) {
          this._oTankTableDialog = sap.ui.xmlfragment(
            "tankreporting.view.TanksTableDialog",
            this
          );
          this.getView().addDependent(this._oTankTableDialog);
        }
        this._oTankTableDialog.open();
      },

      onCloseTankTableDialog: function () {
        this._oTankTableDialog.close();
      },

      onSuggest: function (event) {
        debugger;
        var sValue = event.getParameter("suggestValue");
        var oSearchField = event.getSource();
        if (sValue) {
          var aSuggestions = this.getSuggestionsFromModel(sValue);
          oSearchField.suggest(aSuggestions);
        } else {
          oSearchField.suggest([]);
        }
      },

      getSuggestionsFromModel: function (sSearchValue) {
        var aSuggestions = [];
        var oTankModel = this.getView().getModel("tanks");
        var sSelectctProduct = this.byId("filterDropdown2").getValue();

        if (oTankModel && sSelectctProduct) {
          var aTankData = oTankModel.getProperty("/ZMaster_tank");

          if (aTankData && Array.isArray(aTankData)) {
            aSuggestions = aTankData.filter(function (oItem) {
              return oItem.Seqnr.toLowerCase().includes(
                sSearchValue.toLowerCase()
              );
            });
          }
        }
        return aSuggestions.map(function (oItem) {
          return new sap.ui.core.Item({
            text: oItem.Seqnr,
            key: oItem.Seqnr,
          });
        });
      },

      // Searching functionality code for UI
      onSearch: function (oEvent) {
        var sTankNumber = oEvent.getParameter("query");

        // Check if the search query is not empty or null
        if (sTankNumber) {
          if (this._tankData) {
            var oTank = this.masterSetData.find(function (tank) {
              return tank.Seqnr.toLowerCase() === sTankNumber.toLowerCase();
            });

            if (oTank) {
              // Existing logic to handle tank data when found
              var selectedTankNo = oTank.Socnr;
              var sMatnr = oTank.Matnr;
              var selectLgort = oTank.Lgort;
              var selectData = this.masterSetData.find(function (item) {
                return item.Socnr === selectedTankNo;
              });
              var tankData = this.stockDipData.find(function (item) {
                return item.Socnr === selectedTankNo;
              });
              var matnrProduct = this.tankProduct.filter(function (item) {
                return item.MaterialCode.includes(sMatnr);
              });
              var DefData = this.maintainDefaultData.filter(function (item) {
                return item.Lgort === selectLgort;
              });

              if (tankData) {
                var combinedData = {
                  tankData: tankData,
                  selectedTank: selectData,
                  socEvent: this.SocEventSet,
                  status: this.systemStatus,
                  location: this.location,
                  product: this.tankProduct,
                  product: matnrProduct[0],
                  oDefault: DefData.length ? DefData[0] : null,
                };
                if (combinedData.oDefault) {
                  this.openTankDetailsDialog(combinedData, oTank.Matnr);
                } else {
                  // If default data doesn't exist, set default values to empty
                  combinedData.oDefault = {
                    MaterialTempQty: "",
                    MaterialTempUom: "",
                    DensityQty: "",
                    DensityUom: "",
                    TestTempQty: "",
                    TestTempUom: "",
                  };
                  this.openTankDetailsDialog(combinedData, oTank.Matnr);
                }
              } else {
                var onlyTankData = {
                  selectedTank: oTank,
                  socEvent: this.SocEventSet,
                  status: this.systemStatus,
                  location: this.location,
                  product: this.tankProduct,
                  product: matnrProduct[0],
                  oDefault: DefData.length ? DefData[0] : null,
                };
                if (!onlyTankData.oDefault) {
                  // If default data doesn't exist, set default values to empty
                  onlyTankData.oDefault = {
                    MaterialTempQty: "",
                    MaterialTempUom: "",
                    DensityQty: "",
                    DensityUom: "",
                    TestTempQty: "",
                    TestTempUom: "",
                  };
                }
                this.openTankDetailsDialog(onlyTankData, null);
              }
            } else {
              MessageBox.error(`Tank not found for Seqnr: ${sTankNumber}`);
            }
          } else {
            MessageBox.error("Tank data is not available. Please try again.");
          }
        } else {
          // Handle the case when the search query is empty or null
          // For example, clear suggestions or perform other actions
          // this.getView().byId("searchField").setSuggestionItems([]);
        }
      },
      // details dialog fragment code in which bind the details of tank when user clicked on tank
      openTankDetailsDialog: function (combinedData, matnr) {
        // console.log("dialog box data is:" + JSON.stringify(matnr));
        if (!this._oDialog) {
          this._oDialog = sap.ui.xmlfragment(
            "tankreporting.view.DetailsDialog",
            this
          );
          this.getView().addDependent(this._oDialog);
        }
        var oDialogModel = new sap.ui.model.json.JSONModel();
        oDialogModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
        oDialogModel.setData(combinedData);

        this._oDialog.setModel(oDialogModel, "tankDetails");
        var socEventData = combinedData.socEvent;
        var oSocEventModel = new JSONModel(socEventData);
        this._oDialog.setModel(oSocEventModel, "socEvent");
        var statusData = combinedData.status;
        var statusModel = new JSONModel(statusData);
        this._oDialog.setModel(statusModel, "status");
        var locationData = combinedData.location;
        var locModel = new JSONModel(locationData);
        this._oDialog.setModel(locModel, "location");

        var oTankLevel = this._oDialog
          .getContent()[0]
          .getItems()[0]
          .getItems()[0];
        if (oTankLevel) {
          switch (matnr) {
            case "8000":
              oTankLevel.addStyleClass("pms");
              break;
            case "8100":
              oTankLevel.addStyleClass("diesel");
              break;
            case "84001":
              oTankLevel.addStyleClass("crude");
              break;
            default:
              oTankLevel.addStyleClass("inner_level");
              break;
          }
        }
        // console.log("all fragment model data:", this._oDialog.getModel("tankDetails").getData());
        this._oDialog.open();
      },
      onDialogClose: function () {
        if (this._oDialog) {
          var CreateDipHeader = this.getView().getModel("formData");
         
          // this.refreshTankData();
          // debugger;
          // this.refreshTankDataModel()
          // .then(function() {
          //     console.log("successfully laoded");
          // })
          // .catch(function(error) {
          //     console.log("error find during loadin data:",error)
          // });

          // this.modelRefresh()
          this._oDialog.destroy();
          this._oDialog = null;
        }
      },

      refreshTankData: function() {
        debugger;
            var updatedFullTankModel = new JSONModel({
                tankData: Object.values(latestTankDataMap),
                status: this.systemStatus,
                product: this.tankProduct,
                totalQuantity: this.totalQuantity
            });
            this.getView().setModel(updatedFullTankModel, "tanks");
        }, 

      // modelRefresh:function(){
      //   var oModel = this.getView().getModel("tanks")
      //   oModel.refresh(true)
      // },

      // after close reload the main service model
      refreshTankDataModel: function () {
        debugger;
        var oModel = this.getView().getModel("tanks");

        return new Promise(function (resolve, reject) {
          oModel.loadData("/ZMaster_tank", {
            success: function (oData) {
              oModel.setData(oData);
              resolve();
            },
            error: function (oError) {
              console.error("Error refreshing tank data:", oError);
              reject(oError);
            },
          });
        });
      },

      // get code to add product with material number in detail's fragment page
      getCombinedText: function (sMatnr, sProduct) {
        return sMatnr + " - " + sProduct;
      },

      // Text percentage calculate code
      calculatePercentageText: function (availableWater) {
        var totalCapacity = 1000;
        var percentage = (availableWater / totalCapacity) * 100;
        percentage = Math.max(0, Math.min(percentage, 100));
        return Math.round(percentage) + "%";
      },

      onEditPress1: function (oEvent) {
        const controlId = oEvent.mParameters.id;
        const oSelect = sap.ui.getCore().byId(controlId);
        oSelect.oParent.mAggregations.items[1].setEditable(true);
      },

      // write code to set the status in model
      onStatusChange: function (oEvent) {
        var selectedKey = oEvent.getSource().getSelectedKey();
        var formDataModel = this.getView().getModel("statusData");
        formDataModel.setProperty("/status", selectedKey);
      },

      // Define the formatter function for showing the actual stock in tank's card
    //   formatStockText: function(value) {
    //     if (value !== undefined) {
    //         var floatValue = parseFloat(value);
    //         if (!isNaN(floatValue)) {
    //             var intValue = Math.floor(floatValue);
    //             var formattedValue = intValue.toLocaleString();
    //             return formattedValue.replace(/,/g, ".");
    //         }
    //     }
    //     return '0';
    // },      
    formatStockText: function(value) {
      if (value !== undefined) {
          var floatValue = parseFloat(value);
          if (!isNaN(floatValue)) {
              var roundedValue = Math.round(floatValue);
              var stringValue = roundedValue.toString();
              var formattedValue = stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
              return formattedValue;
          }
      }
      return '0';
  },
  


      statusText: function (status) {
        switch (status) {
          case "01":
            return "RECEIPT";
          case "02":
            return "IDLE";
          case "03":
            return "DELIVERY";
          case "04":
            return "MAINTENANCE";
          default:
            return "ADD STATUS";
        }
      },

      // code using for create the status of a tank in table
      // updateStatus: function (oEvent) {
      //   var that = this;
      //   var statusDipData = this.getView().getModel("statusData");
      //   var tankDetailsModel = this._oDialog.getModel("tankDetails");
      //   var socnr = tankDetailsModel.getProperty("/selectedTank/Socnr");
      //   statusDipData.setProperty("/socnr", socnr);
      //   var data = statusDipData.getData();
      //   var oModel = this.getOwnerComponent().getModel("tanks");
      //   var statusDataPayload = {
      //     Socnr: data.socnr,
      //     Zzstatus: data.status,
      //   };
      //   console.log("update data", statusDataPayload);
      //   oModel.create("/System_statusSet", statusDataPayload, {
      //     success: function () {
      //       MessageBox.success("Update successfully!!");
      //       var cValue = sap.ui.getCore().byId("status_selectBox").setValue("");
      //       statusDipData.setData({
      //         socnr: "",
      //         status: "",
      //       });
      //     },
      //     error: function (error) {
      //       console.log("Error while creating the data", error);
      //       if (error.response) {
      //         console.error("Response: ", error.response);
      //       }
      //       console.log("Error while creating the data");
      //     },
      //   });
      // },

      updateStatus: function (oEvent) {
        var that = this;
        var statusDipData = this.getView().getModel("statusData");
        var tankDetailsModel = this._oDialog.getModel("tankDetails");
        var socnr = tankDetailsModel.getProperty("/selectedTank/Socnr");
        statusDipData.setProperty("/socnr", socnr);
        var data = statusDipData.getData();
        var oModel = this.getOwnerComponent().getModel("tanks");
        var statusDataPayload = {
            Socnr: data.socnr,
            Zzstatus: data.status,
        };
    
        // Show busy indicator before making the request
        BusyIndicator.show();
    
        oModel.create("/System_statusSet", statusDataPayload, {
            success: function () {
                MessageBox.success("Update successfully!!");
                var cValue = sap.ui.getCore().byId("status_selectBox").setValue("");
                statusDipData.setData({
                    socnr: "",
                    status: "",
                });
                // Hide busy indicator after successful response
                BusyIndicator.hide();
            },
            error: function (error) {
                console.log("Error while creating the data", error);
                if (error.response) {
                    console.error("Response: ", error.response);
                }
                console.log("Error while creating the data");
                // Hide busy indicator after handling the error
                BusyIndicator.hide();
            },
        });
    },
    

      // status update code
      onStatsChange: function (oEvent) {
        var oSelect = oEvent.getSource();
        var sSelectedKey = oSelect.getSelectedKey();
        sap.m.MessageBox.confirm(
          "Are you sure you want to update the status?",
          {
            title: "Confirmation",
            onClose: function (oAction) {
              if (oAction === sap.m.MessageBox.Action.OK) {
                console.log("Updating status to: " + sSelectedKey);
              } else {
                oSelect.setSelectedKey(this._lastSelectedKey);
              }
            }.bind(this),
          }
        );
      },

      // calculate the height for creating tank inner level
      //   formatHeight: function (sAvailableStock, sMaxCapacity) {
      //     sAvailableStock = parseFloat(sAvailableStock);
      //     sMaxCapacity = parseFloat(sMaxCapacity);
      //     if (isNaN(sAvailableStock) || isNaN(sMaxCapacity)) {
      //         return '0%';
      //     }
      //     if (sMaxCapacity === 0 || sAvailableStock < 0) {
      //         return '0%';
      //     }
      //     if (sAvailableStock > sMaxCapacity) {
      //         sAvailableStock = sMaxCapacity;
      //     }
      //     const percentage = (sAvailableStock / sMaxCapacity) * 100;
      //     const formattedPercentage = Math.max(0, Math.min(100, percentage));
      //     return formattedPercentage.toFixed(2) + '%';
      // },

      // calculate height of inner level of tank
      formatHeight: function (sAvailableStock, sMaxCapacity) {
        sAvailableStock = parseFloat(sAvailableStock);
        sMaxCapacity = parseFloat(sMaxCapacity);
        if (
          isNaN(sAvailableStock) ||
          isNaN(sMaxCapacity) ||
          sMaxCapacity === 0 ||
          sAvailableStock < 0
        ) {
          return "0%";
        }

        const percentage = (sAvailableStock / sMaxCapacity) * 100;
        let formattedPercentage = Math.max(0, Math.min(100, percentage));
        // console.log("css height",formattedPercentage.toFixed(0));
        
        if (Math.round(formattedPercentage) > 45) {
          formattedPercentage -= 3;
        }

        return formattedPercentage.toFixed(0) + "%";
      },

      // calculate height in percentage to given height of tank
      formattextHeightPercentage: function (sAvailableStock, sMaxCapacity) {
        const pCalculate = (sAvailableStock / sMaxCapacity) * 100;
        return pCalculate.toFixed(1) + "%";
      },

      formatQuantity: function (quantity) {
        return parseFloat(quantity).toLocaleString();
      },

      // find product based on material no and shown on tank card
      formatProductText: function (matnr) {
          var filterGroup = this.tankProduct.filter(function(item) {
              return item.MaterialCode.includes(matnr);
              }).map(function(prod){
           return prod.ProductGroup
       })
          var filterGroupData = filterGroup[0]
          return filterGroupData
      },


      formatooltip: function (sSocnr, sLgort, QuanLvc) {
        var oPopover = new sap.m.Popover({
          title: "Tank Details",
          content: [
            new sap.m.VBox({
              items: [
                new sap.m.Label({ text: "S No:" }),
                new sap.m.Text({ text: sSocnr }),
                new sap.m.Label({ text: "Storage:" }),
                new sap.m.Text({ text: sLgort }),
                new sap.m.Label({ text: "Quantity:" }),
                new sap.m.Text({ text: QuanLvc }),
              ],
            }),
          ],
        });
        return oPopover;
      },

      onPercentage: function () {
        const tankLayout = this.byId("tank_layout");
        if (tankLayout) {
          tankLayout.getItems().forEach((container) => {
            const tankReporting = container.getItems();
            if (tankReporting) {
              const tankLevel = tankReporting[0]?.getItems()[0];
              if (tankLevel) {
                const availableStock = tankLevel
                  .getBindingContext("tanks")
                  ?.getObject()?.ADQNTP;
                const maxCapacity = tankLevel
                  .getBindingContext("tanks")
                  ?.getObject()?.Kapaz;
                // console.log("quantity is",quantity,maxCapacity);
                const pCalculate = (availableStock * 100) / maxCapacity;
                const innerLevel = tankLevel.byId("tank_level");
                if (innerLevel) {
                  innerLevel.setHeight(`${pCalculate}%`);
                }
              }
            }
          });
        }
      },

      // craeting a table of all tanks and showing it inside a fragment
      handleTableSelectDialog: function (oEvent,value) {
        var oButton = oEvent.getSource(),
          oView = this.getView();
        if (!this._pDialog) {
          this._pDialog = Fragment.load({
            id: oView.getId(),
            name: "tankreporting.view.TanksTableDialog",
            controller: this,
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            return oDialog;
          });
        }

        this._pDialog.then(
          function (oDialog) {
            this._configDialog(oButton, oDialog);
            oDialog.open();
          }.bind(this)
        );
      },

      _configDialog: function (oButton, oDialog) {
        // Set draggable property
        var bDraggable = oButton.data("draggable");
        oDialog.setDraggable(bDraggable == "true");
        // Set resizable property
        var bResizable = oButton.data("resizable");
        oDialog.setResizable(bResizable == "true");
        // Multi-select if required
        var bMultiSelect = !!oButton.data("multi");
        oDialog.setMultiSelect(bMultiSelect);
        // Remember selections if required
        var bRemember = !!oButton.data("remember");
        oDialog.setRememberSelections(bRemember);
        var sResponsivePadding = oButton.data("responsivePadding");
        var sResponsiveStyleClasses =
          "sapUiResponsivePadding--header sapUiResponsivePadding--subHeader sapUiResponsivePadding--content sapUiResponsivePadding--footer";
        if (sResponsivePadding) {
          oDialog.addStyleClass(sResponsiveStyleClasses);
        } else {
          oDialog.removeStyleClass(sResponsiveStyleClasses);
        }
        var sCustomConfirmButtonText = oButton.data("confirmButtonText");
        oDialog.setConfirmButtonText(sCustomConfirmButtonText);
        syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);
      },


      handleLiveChange: function (oEvent) {
        var sQuery = oEvent.getParameter("value");
        var aFilters = [];
        if (sQuery) {
            var oFilter1 = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sQuery);
            var oFilter2 = new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.Contains, sQuery);
            var oFilter3 = new sap.ui.model.Filter("Seqnr", sap.ui.model.FilterOperator.Contains, sQuery);
    
            aFilters.push(new sap.ui.model.Filter([oFilter1, oFilter2, oFilter3], false));
        }
        var oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter(aFilters);
        var aFilteredItems = oBinding.getCurrentContexts();
        var totalADQNTP = 0;
        for (var i = 0; i < aFilteredItems.length; i++) {
            var oItem = aFilteredItems[i].getObject();
            totalADQNTP += parseFloat(oItem.ADQNTP);
        }
        var newTotal = this.formatStockText(totalADQNTP)    
        var oDialog = oEvent.getSource();
        var sTitle = "Total Quantity (" + newTotal + ")";
        oDialog.setTitle(sTitle);
    },
    

      // create code for search functionality when pressed enter
      handleSearch: function (oEvent) {
        var sValue = oEvent.getParameter("value");
        var oFilterLgort = new Filter("Lgort", FilterOperator.Contains, sValue);
        var oFilterMatnr = new Filter("Matnr", FilterOperator.Contains, sValue);
        var oFilterSeqnr = new Filter("Seqnr", FilterOperator.Contains, sValue);
        var oFilter = new Filter({
          filters: [oFilterLgort, oFilterMatnr, oFilterSeqnr],
          and: false,
        });
        var oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter(oFilter);
        oDialog.setTitle(oController.formattotalQuantity(oBinding.getContexts()));
      },

      // write code for count the total tanks inside the dialog box
      formatItemCount: function (aItems) {
        if (!aItems) {
          return "";
        } else {
          return aItems.length + " items";
        }
      },

      // tanks table's close code for dialog box
      handleClose: function (oEvent) {
        // reset the filter
        var oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter([]);
        var aContexts = oEvent.getParameter("selectedContexts");
      },

      //write code for Handle the row selection change event and showing tank details dialog
      onSelectRow: function (oEvent) {
        debugger;
        var oDialog = oEvent.getSource();
        var oSelectedItem = oEvent.getParameter("listItem");
        if (oSelectedItem) {
          var sSocnr = oSelectedItem
            .getBindingContext("tanks")
            .getProperty("Socnr");
          var sMatnr = oSelectedItem
            .getBindingContext("tanks")
            .getProperty("Matnr");
          var selectLgort = oSelectedItem
            .getBindingContext("tanks")
            .getProperty("Lgort");
          var masterData = this.masterSetData.filter(function (tankSocnr) {
            return tankSocnr.Socnr == sSocnr;
          });
          var matnrProduct = this.tankProduct.filter(function (item) {
            return item.MaterialCode.includes(sMatnr);
          });

          var DefData = this.maintainDefaultData.filter(function (item) {
            return item.Lgort === selectLgort;
          });

          var matchingTankData =
            this.stockDipData
              .filter(function (tankItem) {
                return tankItem.Socnr === sSocnr;
              })
              .sort(function (a, b) {
                return parseInt(b.Etmstm) - parseInt(a.Etmstm);
              })[0] || null;
        }

        if (matchingTankData) {
          var combinedData = {
            tankData: matchingTankData,
            selectedTank: masterData[0],
            socEvent: this.SocEventSet,
            status: this.systemStatus,
            location: this.location,
            product: matnrProduct[0],
            oDefault: DefData.length ? DefData[0] : null,
          };
          if (combinedData.oDefault) {
            this.openTankDetailsDialog(combinedData, masterData[0].Matnr);
          } else {
            // If default data doesn't exist, set default values to empty
            combinedData.oDefault = {
              MaterialTempQty: "",
              MaterialTempUom: "",
              DensityQty: "",
              DensityUom: "",
              TestTempQty: "",
              TestTempUom: "",
            };
            this.openTankDetailsDialog(combinedData, masterData[0].Matnr);
          }
        } else {
          var tankDataOnly = {
            selectedTank: masterData[0],
            socEvent: this.SocEventSet,
            status: this.systemStatus,
            location: this.location,
            product: matnrProduct[0],
            oDefault: DefData.length ? DefData[0] : null,
          };
          if (!tankDataOnly.oDefault) {
            // If default data doesn't exist, set default values to empty
            tankDataOnly.oDefault = {
              MaterialTempQty: "",
              MaterialTempUom: "",
              DensityQty: "",
              DensityUom: "",
              TestTempQty: "",
              TestTempUom: "",
            };
          }
          this.openTankDetailsDialog(tankDataOnly, masterData[0].Matnr);
        }
      },

      // write code for applied class on tanks when tanks are loaded
      onDataLoaded: function () {
        let that = this;
        // debugger;
        const tankLayout = this.byId("tank_layout");
        if (tankLayout) {
          tankLayout.getItems().forEach((container) => {
            const tankReporting = container.getItems();
            if (tankReporting) {
              const tankLevel = tankReporting[0]?.getItems()[0];
              if (tankLevel) {
                const material = tankLevel
                  .getBindingContext("tanks")
                  ?.getObject()?.Matnr;
                if (material) {
                  that.resetStyleClass(tankLevel);
                  switch (material) {
                    case "8000":
                      tankLevel.addStyleClass("pms");
                      break;
                    case "8100":
                      tankLevel.addStyleClass("diesel");
                      break;
                    case "84001":
                      tankLevel.addStyleClass("crude");
                      break;
                    default:
                      tankLevel.addStyleClass("inner_level");
                  }
                }
              }
            }
          });
        }
      },

      resetStyleClass: function (tankLevel) {
        if (tankLevel.hasStyleClass("crude"))
          tankLevel.removeStyleClass("crude");
        if (tankLevel.hasStyleClass("diesel"))
          tankLevel.removeStyleClass("diesel");
        if (tankLevel.hasStyleClass("pms")) tankLevel.removeStyleClass("pms");
      },

      showBapiError: function () {
        let that = this;
        if (!this.oErrorTable) {
          let aColumns = [
            // "ContentID",
            // "code",
            "message",
            // "propertyref",
            "severity",
            // "error",
            // "target",
            // "transition",
          ];
          let oColumns = [];
          aColumns.forEach((column) => {
            oColumns.push(
              new sap.ui.table.Column({
                autoResizable: true,
                label: new sap.m.Label({
                  text: column,
                }),
                template: new sap.m.Text({
                  text: `{errormodel>${column}}`
                }),
              })
            );
          });
          this.oErrorTable = new sap.ui.table.Table({
            selectionMode: sap.ui.table.SelectionMode.None,
            columns: oColumns
          });
          this.oErrorTable.setModel(this.getOwnerComponent().getModel("errormodel"))
          this.oErrorTable.bindRows("errormodel>/errorData")
        }
        if (!this.oErrorDialog) {
          this.oErrorDialog = new sap.m.Dialog({
            title: "Posting Failed",
            contentWidth: "660px",
            contentHeight: "300px",
            resizable: true,
            draggable: true,
            content: that.oErrorTable,
            beginButton: new Button({
              type: sap.m.ButtonType.Emphasized,
              text: "OK",
              press: function () {
                that.oErrorDialog.close();
              }.bind(that),
            }),
          });

          this.oErrorDialog.addStyleClass(
            "sapUiResponsivePadding--content sapUiResponsivePadding--header sapUiResponsivePadding--footer sapUiResponsivePadding--subHeader"
          );
          this.getView().addDependent(this.oErrorDialog);
        }
        this.oErrorDialog.open();
      },
    });
  }
);
