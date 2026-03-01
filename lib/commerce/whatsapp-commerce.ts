/**
 * WhatsApp Commerce Tools
 * 
 * Enables AI workers to handle commerce conversations on WhatsApp:
 * - Product catalog browsing via chat
 * - Order placement and tracking
 * - Payment link generation
 * - Multi-language support
 * 
 * These are tool definitions that get passed to the LLM alongside
 * the existing GHL tools (book_appointment, tag_contact, etc.)
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;          // in cents
  currency: string;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  variants?: Array<{ name: string; price?: number }>;
}

export interface Order {
  id: string;
  contactId: string;
  contactName: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Tool definitions for WhatsApp commerce.
 * These extend the existing GHL_TOOL_DEFINITIONS.
 */
export const COMMERCE_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_products',
      description: 'Show the customer available products or services. Use when they ask what you sell, your menu, or your catalog.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category filter (e.g., "drinks", "main course", "services")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_order',
      description: 'Create an order for the customer. Use when they want to buy/order something.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                name: { type: 'string' },
                quantity: { type: 'number' },
              },
              required: ['name', 'quantity'],
            },
            description: 'Items to order with quantities',
          },
          deliveryAddress: {
            type: 'string',
            description: 'Delivery address if applicable',
          },
          notes: {
            type: 'string',
            description: 'Special instructions or notes',
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_order_status',
      description: 'Check the status of an existing order. Use when customer asks about their order.',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID to check',
          },
          contactId: {
            type: 'string',
            description: 'The contact/customer ID to look up their latest order',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_payment_link',
      description: 'Send a payment link to the customer for their order or service.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Amount in the local currency (e.g., 25.99)',
          },
          description: {
            type: 'string',
            description: 'What the payment is for',
          },
        },
        required: ['amount', 'description'],
      },
    },
  },
];

/**
 * Format a product catalog for chat display.
 */
export function formatCatalogForChat(products: Product[], currency: string = 'USD'): string {
  if (products.length === 0) return "We don't have any products listed right now. How else can I help?";

  const lines: string[] = ['Here\'s what we have available:\n'];
  
  // Group by category
  const categories = new Map<string, Product[]>();
  for (const p of products) {
    const cat = p.category || 'Products';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(p);
  }

  for (const [category, items] of categories) {
    if (categories.size > 1) lines.push(`\n*${category}*`);
    for (const item of items) {
      const price = `$${(item.price / 100).toFixed(2)}`;
      const stock = item.inStock ? '' : ' (out of stock)';
      lines.push(`• ${item.name} — ${price}${stock}`);
      if (item.variants && item.variants.length > 0) {
        for (const v of item.variants) {
          const vPrice = v.price ? ` ($${(v.price / 100).toFixed(2)})` : '';
          lines.push(`  ↳ ${v.name}${vPrice}`);
        }
      }
    }
  }

  lines.push('\nJust tell me what you\'d like to order! 😊');
  return lines.join('\n');
}

/**
 * Format an order confirmation for chat.
 */
export function formatOrderConfirmation(order: Order): string {
  const items = order.items.map(i => 
    `• ${i.quantity}x ${i.name} — $${(i.price * i.quantity / 100).toFixed(2)}`
  ).join('\n');

  const total = `$${(order.totalAmount / 100).toFixed(2)}`;

  return [
    `Order confirmed! ✅`,
    '',
    `Order #${order.id.slice(0, 8)}`,
    items,
    '',
    `Total: **${total}**`,
    order.deliveryAddress ? `Delivery: ${order.deliveryAddress}` : '',
    order.notes ? `Notes: ${order.notes}` : '',
    '',
    `We'll let you know when it's ready! 🎉`,
  ].filter(Boolean).join('\n');
}
