import type { WidgetConfig } from "@medusajs/admin";
import { useState } from "react";

const csvHeader = [
	"Order id",
	"Invoice number",
	"Invoice Date",
	"Status",
	"Customer Name",
	"Customer Email",
	"GSTIN",
	"Item description",
	"Item Quantity",
	"Item Taxable value",
	"Tax Rate",
	"CGST",
	"SGST",
	"IGST",
	"Cess",
	"Shipping Charges",
	"Shipping Tax Rate",
	"Discount",
	"Total Invoice Value",
	"Total Tax Value",
	"Place of Supply",
	"State of Supply",
];

function extractFields(data) {
	const customerFirstName = data?.customer?.first_name || data?.shipping_address?.first_name || "N/A";
	const customerLastName = data?.customer?.last_name || data?.shipping_address?.last_name || "N/A";

	const newdata = [
		data?.display_id || "N/A",
		data?.id?.replace('order_', '') || "N/A",
		data?.created_at || "N/A",
		data?.status || "N/A",
		`${customerFirstName} ${customerLastName}`,
		data?.email || data?.customer?.email || "N/A",
		"GSTIN",
		data?.items?.[0]?.title || '',
		data?.items?.[0]?.quantity || '',
		(data?.items?.[0]?.unit_price || 0) / 100 || '',
		data?.items?.[0]?.tax_lines?.[0]?.rate || '',
		(data?.items?.[0]?.tax_lines?.[0]?.rate || 0) / 2 || '',
		(data?.items?.[0]?.tax_lines?.[0]?.rate || 0) / 2 || '',
		'0',
		'0',
		data?.shipping_total / 100 || 0,
		'0',
		data?.discount_total / 100 || 0,
		data?.total / 100 || 0,
		data?.tax_total / 100 || 0,
		'Bangalore',
		'Karnataka'
	];
	for (let i = 0; i < newdata.length; i++) {
		const data = newdata[i];
		if (data && typeof data === "string") {
			newdata[i] = data.replaceAll(",", " ");
		}
	}

	return newdata;
}

function convertToCSV(header, dataArray) {
	const headerRow = header.join(",") + "\n";
	const dataRows = dataArray.map((data) => data.join(",")).join("\n");
	return headerRow + dataRows;
}

const getAllCarts = async ({ startDate, endDate }) => {
	let query = "";
	if (startDate) {
		query = `${query}&created_at[gte]=${startDate}`;
	}
	if (endDate) {
		query = `${query}&created_at[lte]=${endDate}`;
	}
	try {
		const response = await fetch(
			`${process.env.MEDUSA_BACKEND_URL}/admin/orders?limit=&fields=id,display_id,status,created_at,shipping_total,discount_total,tax_total,refunded_total,total,subtotal,paid_total,refundable_amount,currency_code,customer_id,email,fulfillment_status,payment_status${query}`,
			{
				credentials: "include",
			}
		);
		if (!response.ok) return;
		const jsonData = await response.json();

		return jsonData;
	} catch (error) {
		console.log(error);
	}
};

const OrderExport = () => {
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	const handleDownload = async () => {
		const { orders } = await getAllCarts({ startDate, endDate });

		// generate orders for each items separately
		const formattedOrdes = [];
		orders.forEach(order => {
			order.items.forEach(item => {
				const duplicatedOrder = Object.assign({}, order); // Clone order
				duplicatedOrder.items = [item]; // Only include the current item
				formattedOrdes.push(duplicatedOrder);
			});
		});

		const flattenedDataArray = formattedOrdes.map((data) => extractFields(data));

		const csvData = convertToCSV(csvHeader, flattenedDataArray);

		const blob = new Blob([csvData], { type: "text/csv" });
		const link = document.createElement("a");
		link.href = window.URL.createObjectURL(blob);
		link.download = "data.csv";
		link.click();
	};

	const handleStartDateChange = (e) => {
		setStartDate(e.target.value);
	};

	const handleEndDateChange = (e) => {
		setEndDate(e.target.value);
	};

	return (
		<div className="flex gap-4 items-center">
			<div className="flex gap-2 items-center">
				<input
					type="date"
					name="startDate"
					className="bg-white py-2 px-4 rounded-lg border font-bold"
					placeholder="Start Date"
					onChange={handleStartDateChange}
				/>
				<span>-</span>
				<input
					type="date"
					name="endDate"
					className="bg-white py-2 px-4 rounded-lg border font-bold"
					placeholder="End Date"
					onChange={handleEndDateChange}
				/>
			</div>
			<button
				type="button"
				className="bg-white py-2 px-4 rounded-lg border font-bold"
				onClick={handleDownload}
			>
				Export Orders
			</button>
		</div>
	);
};

export const config: WidgetConfig = {
	zone: "order.list.before",
};

export default OrderExport;