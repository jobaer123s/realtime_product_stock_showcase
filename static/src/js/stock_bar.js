/** @odoo-module */

import { Component, onMounted, useRef } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { standardFieldProps } from '@web/views/fields/standard_field_props';

class TrendMiniChart extends Component {
    static template = "realtime_product_stock_showcase.TrendMiniChart";
    static props = {
        ...standardFieldProps,
    };

    setup() {
        this.containerRef = useRef("chart");
        onMounted(() => {
            this.renderMiniBars();
        });
    }

    renderMiniBars() {
        const container = this.containerRef.el;
        if (!container) return;
        container.innerHTML = '';

        let purchaseTrend = [];
        let saleTrend = [];

        try {
            const rawData = this.props.record._values.stock_history_json;
            if (rawData && typeof rawData === 'object') {
                purchaseTrend = Array.from(rawData.purchase_trend || []);
                saleTrend = Array.from(rawData.sale_trend || []);
            }
        } catch (e) {
            console.error('Error parsing stock history:', e);
        }

        const max = Math.max(...purchaseTrend, ...saleTrend, 1);  // Avoid div by zero
        const maxBarHeight = 18;  // In pixels

        for (let i = 0; i < 7; i++) {
            const wrapper = document.createElement("div");
            wrapper.style.display = "inline-flex";
            wrapper.style.flexDirection = "column-reverse";
            wrapper.style.alignItems = "center";
            wrapper.style.marginRight = "2px";
            wrapper.style.width = "6px";

            const purchaseVal = purchaseTrend[i] || 0;
            const saleVal = saleTrend[i] || 0;

            const purchaseBar = document.createElement("div");
            purchaseBar.style.height = `${(purchaseVal / max) * maxBarHeight}px`;
            purchaseBar.style.width = "4px";
            purchaseBar.style.backgroundColor = "#3B82F6";
            purchaseBar.title = `Purchase: ${purchaseVal}`;

            const saleBar = document.createElement("div");
            saleBar.style.height = `${(saleVal / max) * maxBarHeight}px`;
            saleBar.style.width = "4px";
            saleBar.style.backgroundColor = "#EF4444";
            saleBar.title = `Sale: ${saleVal}`;

            wrapper.appendChild(saleBar);
            wrapper.appendChild(purchaseBar);
            container.appendChild(wrapper);
        }
    }


}

export const trendMiniChart = {
    component: TrendMiniChart,
};

registry.category("fields").add("stock_trend_widget", trendMiniChart);
