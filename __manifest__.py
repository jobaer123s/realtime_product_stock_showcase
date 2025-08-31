{
    "name": "Real-Time Product Stock Showcase",
    "version": "1.0",
    "summary": "Display real-time stock of consumable products grouped by location",
    "author": "Jobaer Hossain - jobaer.jhs@gmail.com",
    "category": "Inventory",
    "depends": ["stock"],
    "data": [
        "security/ir.model.access.csv",
        "views/stock_quant_list_controller_view.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "realtime_product_stock_showcase/static/src/js/stock_quant_list_controller.js",
            "realtime_product_stock_showcase/static/src/js/stock_bar.js",
            "realtime_product_stock_showcase/static/src/xml/stock_trend_widget.xml",
        ]
    },
    "installable": True,
    "application": False,
    "license": "LGPL-3"
}
