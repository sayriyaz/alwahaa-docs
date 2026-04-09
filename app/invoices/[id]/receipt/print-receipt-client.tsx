'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import alWahaaLogo from '@/Picture/alwahaa grp.png'
import type { ClientDetails, Invoice, InvoiceReceipt } from '../invoice-detail-client'

function formatAmount(amount: number | null) {
  return (amount ?? 0).toFixed(2)
}

function numberToWords(num: number | null) {
  if (!num) {
    return 'Zero'
  }

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convert(n: number): string {
    if (n < 20) {
      return ones[n]
    }
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : '')
    }
    if (n < 1000) {
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ` ${convert(n % 100)}` : '')
    }
    if (n < 100000) {
      return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ` ${convert(n % 1000)}` : '')
    }
    return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ` ${convert(n % 100000)}` : '')
  }

  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)

  let result = convert(integerPart)
  if (decimalPart > 0) {
    result += ` and ${convert(decimalPart)} Fils`
  }

  return result
}

export default function PrintReceiptClient({
  invoice,
  client,
  receipts,
}: {
  invoice: Invoice
  client: ClientDetails | null
  receipts: InvoiceReceipt[]
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 500)
    return () => window.clearTimeout(timer)
  }, [])

  const totalReceived = receipts.reduce((sum, receipt) => sum + (receipt.amount ?? 0), 0)
  const attentionName = invoice.beneficiary_name?.trim() || client?.contact_person?.trim() || null
  const paymentModes = [...new Set(receipts.map((receipt) => receipt.payment_mode).filter(Boolean))]
  const receiptNotes = [...new Set(receipts.map((receipt) => receipt.notes?.trim()).filter(Boolean))]
  const accountDescription = receiptNotes.join(' / ') || invoice.notes?.trim() || 'Receipt against invoice payment'

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #000;
          background: #fff;
        }
      `}</style>

      <div className="no-print fixed right-4 top-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-green-700"
        >
          🖨️ Print / Save PDF
        </button>
        <button
          onClick={() => {
            if (window.opener) {
              window.close()
              return
            }
            window.history.back()
          }}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 shadow-lg hover:bg-gray-200"
        >
          Close
        </button>
      </div>

      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '20px', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <Image
              src={alWahaaLogo}
              alt="Al Wahaa Group logo"
              priority
              style={{ width: '170px', height: 'auto', margin: '0 auto' }}
            />
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AL WAHAA DOCUMENTS CLEARING</div>
          <div>Dubai</div>
          <div>Emirate: Dubai</div>
          <div>Contact: +971 4 255 2895, +971-50 355 4871 / 52 665 4290</div>
          <div>E-Mail: info@alwahaagroup.com</div>
          <div>www.alwahaagroup.com</div>
        </div>

        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', textDecoration: 'underline' }}>
          Receipt Voucher
        </div>

        <table width="100%" style={{ marginBottom: '20px' }}>
          <tbody>
            {receipts.length > 0 ? receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td width="50%">
                  <strong>No. : {receipt.receipt_no || '—'}</strong>
                </td>
                <td width="50%" style={{ textAlign: 'right' }}>
                  <strong>Dated : {receipt.date || invoice.date || '—'}</strong>
                </td>
              </tr>
            )) : (
              <tr>
                <td width="50%"><strong>No. : —</strong></td>
                <td width="50%" style={{ textAlign: 'right' }}><strong>Dated : {invoice.date || '—'}</strong></td>
              </tr>
            )}
          </tbody>
        </table>

        {paymentModes.length > 0 ? (
          <div style={{ marginBottom: '16px' }}>
            <strong>Through : {paymentModes.join(', ')}</strong>
          </div>
        ) : null}

        <div style={{ borderBottom: '1px solid #000', marginBottom: '16px' }} />

        <table width="100%" style={{ borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>Particulars</th>
              <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', width: '150px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '10px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Account:</div>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{client?.name || 'Unknown client'}</div>
                {attentionName ? (
                  <div style={{ marginTop: '4px', color: '#555' }}>Attn: {attentionName}</div>
                ) : null}
                <div style={{ marginTop: '8px' }}>
                  {receipts.length > 0 ? receipts.map((receipt) => (
                    <div key={receipt.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', gap: '16px' }}>
                      <span style={{ color: '#555' }}>
                        Agst Ref {invoice.invoice_no}
                        {receipt.notes ? ` - ${receipt.notes}` : ''}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>{formatAmount(receipt.amount)} Cr</span>
                    </div>
                  )) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', gap: '16px' }}>
                      <span style={{ color: '#555' }}>Agst Ref {invoice.invoice_no}</span>
                      <span style={{ fontWeight: 'bold' }}>0.00 Cr</span>
                    </div>
                  )}
                </div>
              </td>
              <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', verticalAlign: 'top' }}>
                {formatAmount(totalReceived)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: '8px' }}>
          <strong>On Account of:</strong>
        </div>
        <div style={{ marginBottom: '16px', paddingLeft: '10px' }}>
          {attentionName ? `${attentionName} - ${accountDescription}` : accountDescription}
          <br />
          <span style={{ color: '#555' }}>ref_in: {invoice.invoice_no}</span>
        </div>

        <div style={{ marginBottom: '6px' }}>
          <strong>Amount (in words):</strong>
        </div>
        <div style={{ marginBottom: '20px', paddingLeft: '10px' }}>
          UAE Dirham {numberToWords(totalReceived)} Only
        </div>

        <table width="100%" style={{ marginBottom: '30px' }}>
          <tbody>
            <tr>
              <td />
              <td width="200px" style={{ border: '2px solid #000', padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                AED {formatAmount(totalReceived)}
              </td>
            </tr>
          </tbody>
        </table>

        <table width="100%" style={{ marginTop: '40px' }}>
          <tbody>
            <tr>
              <td width="50%" />
              <td width="50%" style={{ textAlign: 'right' }}>
                <div>for AL WAHAA DOCUMENTS CLEARING</div>
                <div style={{ marginTop: '40px', color: '#555', fontSize: '11px' }}>Authorised Signatory</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#555' }}>
          This is a Computer Generated Receipt
        </div>
      </div>
    </>
  )
}
