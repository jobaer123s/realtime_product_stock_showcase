/** @odoo-module */

import { ListController } from "@web/views/list/list_controller";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { listView } from "@web/views/list/list_view";

class StockQuantListController extends ListController {
    setup() {
        super.setup();
        this.bus = useService("bus_service");
        this.busService = useService("bus_service");
        this.onQuantSync = this.onQuantSync.bind(this);
        // Listen for custom event
        this.bus.subscribe("stock.quant.sync", () => {
            console.log("realtime_stock_channel");
            this.onQuantSync();
        });
    }
    onQuantSync() {
        console.log("📡 realtime_stock_channel received");
        this.reload();
    }

    willUnmount() {
        super.willUnmount();
        this.bus.unsubscribe("stock.quant.sync", this.onQuantSync);
    }

    async reload(){
        try{
            await this.env.model.root.load();
            this.env.model.notify();
        }
        catch (e) {
            console.log('exception----', e)
        }

    }
}

// Register new list view
registry.category("views").add("stock_quant_auto_sync_list", {
    ...listView,
    Controller: StockQuantListController,
});
