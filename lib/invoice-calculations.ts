type AmountLike = {
  amount: number | null
}

export function calculateServiceSubtotal(items: AmountLike[]) {
  return items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
}

export function calculateVatAmount(processingFee: number | null) {
  return (processingFee ?? 0) * 0.05
}

export function calculateInvoiceTotalAmount(items: AmountLike[], processingFee: number | null) {
  return calculateServiceSubtotal(items) + (processingFee ?? 0) + calculateVatAmount(processingFee)
}
