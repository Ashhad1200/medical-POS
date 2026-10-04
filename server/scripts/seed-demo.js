const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

const DEMO = {
  email: "syedashhad17@gmail.com",
  username: "ashhad",
  password: "Ashhad123",
  fullName: "Syed Ashhad",
  orgCode: "ashhad_demo",
  orgName: "Ashhad Demo Pharmacy",
  slug: "ashhad-demo",
  supplierCode: "ashhad_demo_supplier",
  supplierName: "Ashhad Demo Supply Co.",
};

const CATALOGUE = [
  { name: "Paracetamol 500mg Tablets", generic: "Paracetamol", mfr: "Demo Pharma", cat: "Analgesics", form: "Tablet", strength: "500mg", pack: "10 tablets", rx: false, gst: 0, color: "#0f766e", sell: 120, cost: 90, mrp: 130 },
  { name: "Ibuprofen 400mg Tablets", generic: "Ibuprofen", mfr: "Demo Pharma", cat: "Analgesics", form: "Tablet", strength: "400mg", pack: "10 tablets", rx: false, gst: 0, color: "#0f766e", sell: 180, cost: 135, mrp: 200 },
  { name: "Amoxicillin + Clavulanate 625mg", generic: "Amoxicillin/Clavulanic acid", mfr: "Northstar Labs", cat: "Antibiotics", form: "Tablet", strength: "625mg", pack: "6 tablets", rx: true, gst: 0, color: "#7c3aed", sell: 650, cost: 480, mrp: 700 },
  { name: "Azithromycin 500mg Tablets", generic: "Azithromycin", mfr: "Northstar Labs", cat: "Antibiotics", form: "Tablet", strength: "500mg", pack: "3 tablets", rx: true, gst: 0, color: "#7c3aed", sell: 420, cost: 310, mrp: 460 },
  { name: "Povidone-Iodine Antiseptic 100ml", generic: "Povidone-Iodine", mfr: "CarePlus Health", cat: "First Aid", form: "Solution", strength: "10%", pack: "100 ml", rx: false, gst: 0, color: "#0284c7", sell: 150, cost: 105, mrp: 170 },
  { name: "Vitamin C 1000mg Effervescent", generic: "Ascorbic acid", mfr: "VitaLife", cat: "Vitamins", form: "Effervescent tablet", strength: "1000mg", pack: "10 tablets", rx: false, gst: 0, color: "#f59e0b", sell: 350, cost: 260, mrp: 390 },
  { name: "Multivitamin Daily Caps", generic: "Multivitamin complex", mfr: "VitaLife", cat: "Vitamins", form: "Capsule", strength: "-", pack: "30 capsules", rx: false, gst: 0, color: "#f59e0b", sell: 890, cost: 650, mrp: 980 },
  { name: "Dextromethorphan Cough Syrup 100ml", generic: "Dextromethorphan", mfr: "CarePlus Health", cat: "Cough & Cold", form: "Syrup", strength: "15mg/5ml", pack: "100 ml", rx: false, gst: 0, color: "#e11d48", sell: 240, cost: 175, mrp: 265 },
  { name: "Cetirizine 10mg Tablets", generic: "Cetirizine", mfr: "Demo Pharma", cat: "Allergy", form: "Tablet", strength: "10mg", pack: "10 tablets", rx: false, gst: 0, color: "#16a34a", sell: 95, cost: 60, mrp: 110 },
  { name: "Omeprazole 20mg Capsules", generic: "Omeprazole", mfr: "Northstar Labs", cat: "Digestive", form: "Capsule", strength: "20mg", pack: "14 capsules", rx: false, gst: 0, color: "#0891b2", sell: 310, cost: 220, mrp: 350 },
  { name: "Metformin 500mg Tablets", generic: "Metformin", mfr: "Northstar Labs", cat: "Diabetes Care", form: "Tablet", strength: "500mg", pack: "30 tablets", rx: true, gst: 0, color: "#64748b", sell: 260, cost: 180, mrp: 290 },
  { name: "Glucose Test Strips (50)", generic: "Blood glucose strips", mfr: "GlucoCheck", cat: "Diabetes Care", form: "Test strip", strength: "-", pack: "50 strips", rx: false, gst: 0, color: "#64748b", sell: 2400, cost: 1900, mrp: 2650 },
  { name: "Oral Rehydration Salts Sachet", generic: "ORS", mfr: "VitaLife", cat: "Digestive", form: "Powder", strength: "-", pack: "1 sachet", rx: false, gst: 0, color: "#0891b2", sell: 45, cost: 28, mrp: 55 },
  { name: "Baby Diaper Cream 50g", generic: "Zinc oxide", mfr: "LittleCare", cat: "Baby Care", form: "Cream", strength: "-", pack: "50 g", rx: false, gst: 0, color: "#ec4899", sell: 275, cost: 200, mrp: 300 },
  { name: "Hydrating Face Moisturiser 100g", generic: "Moisturiser", mfr: "DermaPure", cat: "Personal Care", form: "Cream", strength: "-", pack: "100 g", rx: false, gst: 0, color: "#a855f7", sell: 690, cost: 480, mrp: 780 },
];

const STOCK_PLAN = [
  [{ qty: 120, months: 14 }],
  [{ qty: 60, months: 9 }, { qty: 40, months: 20 }],
  [{ qty: 45, months: 11 }],
  [{ qty: 30, months: 3 }, { qty: 50, months: 15 }],
  [{ qty: 70, months: 12 }],
  [{ qty: 55, months: 16 }],
  [{ qty: 25, months: 10 }],
  [{ qty: 40, months: 8 }],
  [{ qty: 90, months: 13 }],
  [{ qty: 35, months: 7 }],
  [{ qty: 18, months: 14 }],
  [{ qty: 12, months: 18 }],
  [{ qty: 80, months: 10 }],
  [{ qty: 42, months: 19 }],
  [{ qty: 28, months: 12 }],
];

const SUPPLIERS = [
  { name: "Metro Med Distributors", contact: "Bilal Ahmed", phone: "+923001110001", city: "Lahore" },
  { name: "Greenfield Wholesale", contact: "Sana Iqbal", phone: "+923001110002", city: "Karachi" },
];

const SUPPLIER_CATALOGUE = [
  { name: "Paracetamol 500mg Tablets", generic: "Paracetamol", mfr: "Demo Pharma", pack: "10 tablets", price: 85, moq: 20 },
  { name: "Amoxicillin + Clavulanate 625mg", generic: "Amoxicillin/Clavulanic acid", mfr: "Northstar Labs", pack: "6 tablets", price: 470, moq: 10 },
  { name: "Cetirizine 10mg Tablets", generic: "Cetirizine", mfr: "Demo Pharma", pack: "10 tablets", price: 58, moq: 20 },
  { name: "Vitamin C 1000mg Effervescent", generic: "Ascorbic acid", mfr: "VitaLife", pack: "10 tablets", price: 255, moq: 10 },
  { name: "Glucose Test Strips (50)", generic: "Blood glucose strips", mfr: "GlucoCheck", pack: "50 strips", price: 1850, moq: 5 },
];

const CUSTOMERS = [
  { name: "Ali Raza", phone: "+923011234501", address: "House 12, Street 4, Gulberg III", city: "Lahore" },
  { name: "Fatima Noor", phone: "+923011234502", address: "Flat 3B, Block C, DHA Phase 5", city: "Lahore" },
  { name: "Hamza Sheikh", phone: "+923011234503", address: "Plot 88, Johar Town", city: "Lahore" },
  { name: "Ayesha Malik", phone: "+923011234504", address: "House 7, Model Town Ext", city: "Lahore" },
];

function productImage(p) {
  const initials = p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" rx="32" fill="${p.color}"/>
<circle cx="200" cy="170" r="92" fill="#ffffff" fill-opacity="0.18"/>
<text x="200" y="196" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="700" fill="#ffffff">${initials}</text>
<text x="200" y="320" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.9">${p.cat}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function monthsFromNow(m) {
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(d) {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString();
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM organizations WHERE code = $1", [DEMO.orgCode]);
    if (existing.rows.length) {
      console.log("Demo org already exists; nothing to do.");
      await client.query("ROLLBACK");
      return;
    }

    const { rows: planRows } = await client.query("SELECT id FROM plans WHERE code = 'pro'");
    if (!planRows.length) throw new Error("Plan 'pro' missing; run migrations first.");
    const planId = planRows[0].id;

    const accessTill = new Date();
    accessTill.setFullYear(accessTill.getFullYear() + 1);

    const { rows: [org] } = await client.query(
      `INSERT INTO organizations (code, name, description, address, phone, email, org_type,
         subscription_tier, plan_id, plan_status, plan_started_at, plan_current_period_end,
         is_active, access_valid_till, currency, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,'pharmacy','pro',$7,'active',NOW(),$8,TRUE,$8,'PKR','Asia/Karachi')
       RETURNING id`,
      [DEMO.orgCode, DEMO.orgName, "Demo pharmacy account for sales and walkthroughs",
        "Main Boulevard, Gulberg III, Lahore", "+923001234567", DEMO.email, planId, accessTill]
    );
    const orgId = org.id;

    const passwordHash = await bcrypt.hash(DEMO.password, 12);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, username, full_name, phone, role, role_in_pos, organization_id,
         is_active, is_email_verified, is_trial_user, subscription_status, access_valid_till, password_hash)
       VALUES ($1,$2,$3,$4,'admin','admin',$5,TRUE,TRUE,FALSE,'active',$6,$7)
       RETURNING id`,
      [DEMO.email, DEMO.username, DEMO.fullName, "+923001234567", orgId, accessTill, passwordHash]
    );
    const userId = user.id;

    const supplierIds = [];
    for (const s of SUPPLIERS) {
      const { rows: [row] } = await client.query(
        `INSERT INTO suppliers (name, contact_person, phone, city, country, payment_terms, credit_limit,
           organization_id, created_by, is_active)
         VALUES ($1,$2,$3,$4,'Pakistan',30,500000,$5,$6,TRUE) RETURNING id`,
        [s.name, s.contact, s.phone, s.city, orgId, userId]
      );
      supplierIds.push(row.id);
    }

    const productIds = [];
    for (const p of CATALOGUE) {
      const { rows: [row] } = await client.query(
        `INSERT INTO products (name, generic_name, manufacturer, category, dosage_form, strength, pack_size,
           prescription_required, gst_rate, low_stock_threshold, is_active, organization_id, created_by, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,15,TRUE,$10,$11,$12) RETURNING id`,
        [p.name, p.generic, p.mfr, p.cat, p.form, p.strength, p.pack, p.rx, p.gst, orgId, userId, productImage(p)]
      );
      productIds.push(row.id);
    }

    for (let i = 0; i < CATALOGUE.length; i++) {
      const p = CATALOGUE[i];
      for (let b = 0; b < STOCK_PLAN[i].length; b++) {
        const batch = STOCK_PLAN[i][b];
        await client.query(
          `INSERT INTO inventory_batches (product_id, batch_number, expiry_date, quantity, selling_price,
             cost_price, mrp, supplier_id, organization_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [productIds[i], `B${String(i + 1).padStart(3, "0")}-${b + 1}`, monthsFromNow(batch.months),
            batch.qty, p.sell, p.cost, p.mrp, supplierIds[i % supplierIds.length], orgId]
        );
      }
    }

    await client.query(
      `INSERT INTO storefront_settings (organization_id, slug, display_name, theme, delivery_fee,
         min_order, cod_enabled, pay_in_store_enabled, is_live)
       VALUES ($1,$2,$3,$4,150,500,TRUE,TRUE,TRUE)`,
      [orgId, DEMO.slug, DEMO.orgName, JSON.stringify({ primary: "#0f766e", accent: "#f59e0b" })]
    );

    const banners = [
      { headline: "Free delivery on orders over PKR 2,000", sub: "Order online, rider at your door in 60 minutes", cta: "Shop now", href: "#catalogue", color: "#0f766e" },
      { headline: "Vitamins & immunity essentials", sub: "Stock up for the season", cta: "See vitamins", href: "#catalogue", color: "#f59e0b" },
      { headline: "Diabetes care, delivered", sub: "Test strips and medicines with refill reminders", cta: "Explore", href: "#catalogue", color: "#64748b" },
    ];
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      await client.query(
        `INSERT INTO storefront_banners (organization_id, headline, subheadline, cta_label, cta_href,
           bg_style, bg_value, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,'color',$6,$7,TRUE)`,
        [orgId, b.headline, b.sub, b.cta, b.href, b.color, i]
      );
    }

    const dealIdx = [0, 6];
    for (const i of dealIdx) {
      await client.query(
        `INSERT INTO storefront_deals (organization_id, product_id, discount_pct, starts_at, ends_at, is_active)
         VALUES ($1,$2,$3,NOW(),$4,TRUE)`,
        [orgId, productIds[i], i === 0 ? 10 : 15, daysFromNow(30)]
      );
    }

    const featuredIdx = [0, 4, 5, 8];
    for (let i = 0; i < featuredIdx.length; i++) {
      await client.query(
        `INSERT INTO storefront_featured_products (organization_id, product_id, sort_order) VALUES ($1,$2,$3)`,
        [orgId, productIds[featuredIdx[i]], i]
      );
    }

    const orderPlan = [
      { status: "delivered", pay: "paid", method: "cod", items: [[0, 2], [5, 1]], cust: 0, daysAgo: 6 },
      { status: "delivered", pay: "unpaid", method: "cod", items: [[7, 1], [1, 3]], cust: 1, daysAgo: 4 },
      { status: "out_for_delivery", pay: "unpaid", method: "cod", items: [[10, 2]], cust: 2, daysAgo: 0, rider: "Usman (Rider 2)", riderPhone: "+923009990011" },
      { status: "placed", pay: "unpaid", method: "cod", items: [[4, 1], [8, 2], [13, 1]], cust: 3, daysAgo: 0 },
    ];

    for (let n = 0; n < orderPlan.length; n++) {
      const o = orderPlan[n];
      const c = CUSTOMERS[o.cust];
      let subtotal = 0;
      const lines = o.items.map(([idx, qty]) => {
        const p = CATALOGUE[idx];
        const unit = p.sell;
        const line = unit * qty;
        subtotal += line;
        return { idx, qty, unit, line, name: p.name, productId: productIds[idx] };
      });
      const deliveryFee = subtotal >= 2000 ? 0 : 150;
      const total = subtotal + deliveryFee;
      const placedAt = new Date(Date.now() - o.daysAgo * 86400000).toISOString();

      const { rows: [so] } = await client.query(
        `INSERT INTO storefront_orders (organization_id, order_number, customer_name, customer_phone,
           customer_address, customer_city, subtotal, delivery_fee, total, payment_method, payment_status,
           status, rider_name, rider_phone, placed_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) RETURNING id`,
        [orgId, `SF-DEMO-${String(n + 1).padStart(4, "0")}`, c.name, c.phone, c.address, c.city,
          subtotal, deliveryFee, total, o.method, o.pay, o.status, o.rider || null, o.riderPhone || null, placedAt]
      );

      for (const l of lines) {
        await client.query(
          `INSERT INTO storefront_order_items (storefront_order_id, medicine_id, name_snapshot,
             unit_price_snapshot, quantity, line_total)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [so.id, l.productId, l.name, l.unit, l.qty, l.line]
        );
      }
      await client.query(
        `INSERT INTO storefront_order_events (storefront_order_id, from_status, to_status, note)
         VALUES ($1, NULL, 'placed', 'Order placed online')`,
        [so.id]
      );
    }

    const { rows: [supplierOrg] } = await client.query(
      `INSERT INTO organizations (code, name, description, org_type, subscription_tier, is_active,
         access_valid_till, currency, timezone, address, phone, email)
       VALUES ($1,$2,$3,'supplier','pro',TRUE,$4,'PKR','Asia/Karachi',$5,$6,$7)
       RETURNING id`,
      [DEMO.supplierCode, DEMO.supplierName, "Demo wholesale supplier for B2B reorder testing",
        accessTill, "Industrial Area, Karachi", "+922111110000", DEMO.email]
    );

    const supplierProductIds = [];
    for (const sp of SUPPLIER_CATALOGUE) {
      const { rows: [row] } = await client.query(
        `INSERT INTO supplier_products (supplier_org_id, name, generic_name, manufacturer, pack_size, unit_price, moq)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [supplierOrg.id, sp.name, sp.generic, sp.mfr, sp.pack, sp.price, sp.moq]
      );
      supplierProductIds.push(row.id);
    }

    await client.query(
      `INSERT INTO supplier_connections (pharmacy_org_id, supplier_org_id, status, credit_limit,
         payment_terms_days, requested_by, approved_by)
       VALUES ($1,$2,'active',500000,30,$3,$3)`,
      [orgId, supplierOrg.id, userId]
    );

    const poItems = [[0, 100], [1, 20], [2, 60]];
    let poTotal = 0;
    const poLines = poItems.map(([idx, qty]) => {
      const sp = SUPPLIER_CATALOGUE[idx];
      const line = sp.price * qty;
      poTotal += line;
      return { idx, qty, line, sp };
    });
    const { rows: [po] } = await client.query(
      `INSERT INTO refactored_purchase_orders (po_number, supplier_id, organization_id, total_amount,
         tax_amount, status, order_date, expected_delivery, notes, created_by, supplier_org_id, source)
       VALUES ('PO-DEMO-0001',$1,$2,$3,0,'ordered',CURRENT_DATE,CURRENT_DATE + 3,
         'Demo B2B reorder from supplier catalogue',$4,$5,'b2b') RETURNING id`,
      [supplierIds[0], orgId, poTotal, userId, supplierOrg.id]
    );
    for (const l of poLines) {
      await client.query(
        `INSERT INTO refactored_purchase_order_items (purchase_order_id, item_name, quantity, unit_cost,
           total_cost, unit_price, total_price, supplier_product_id)
         VALUES ($1,$2,$3,$4,$5,$4,$5,$6)`,
        [po.id, l.sp.name, l.qty, l.sp.price, l.line, supplierProductIds[l.idx]]
      );
    }

    await client.query("COMMIT");
    console.log("Demo data seeded.");
    console.log(`Login: ${DEMO.email} / ${DEMO.password}`);
    console.log(`Storefront: /store/${DEMO.slug}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Demo seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
