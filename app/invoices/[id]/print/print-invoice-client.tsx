'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import alWahaaLogo from '@/Picture/alwahaa grp.png'
import { calculateInvoiceTotalAmount, calculateVatAmount } from '@/lib/invoice-calculations'
import type { Invoice, ServiceOrder } from '../invoice-detail-client'

export type PrintClientDetails = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  trn: string | null
  emirate: string | null
}

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

export default function PrintInvoiceClient({
  invoice,
  client,
  serviceOrders,
}: {
  invoice: Invoice
  client: PrintClientDetails | null
  serviceOrders: ServiceOrder[]
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 500)
    return () => window.clearTimeout(timer)
  }, [])

  const serviceTotal = serviceOrders.reduce((sum, serviceOrder) => sum + (serviceOrder.amount ?? 0), 0)
  const vatAmount = calculateVatAmount(invoice.processing_fee)
  const totalAmount = calculateInvoiceTotalAmount(serviceOrders, invoice.processing_fee)
  const attentionName = invoice.beneficiary_name?.trim() || client?.contact_person?.trim() || null

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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
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
        <table width="100%" style={{ marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td width="60%">
                <div style={{ marginBottom: '12px' }}>
                  <Image
                    src={alWahaaLogo}
                    alt="Al Wahaa Group logo"
                    priority
                    style={{ width: '160px', height: 'auto' }}
                  />
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>AL WAHAA DOCUMENTS CLEARING</div>
                <div>Dubai</div>
                <div>Emirate: Dubai</div>
                <div>TRN: 100376181200003</div>
                <div>Contact: +971 4 255 2895, +971-50 355 4871 / 52 665 4290</div>
                <div>E-Mail: info@alwahaagroup.com</div>
                <div>www.alwahaagroup.com</div>
              </td>
              <td width="40%" style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Tax Invoice</div>
                <table style={{ marginLeft: 'auto', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }}>Invoice No.</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{invoice.invoice_no}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }}>Dated</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{invoice.date || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ border: '1px solid #000', padding: '10px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Buyer</div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{client?.name || 'Unknown client'}</div>
          {attentionName ? (
            <div style={{ fontStyle: 'italic', color: '#444', marginTop: '2px' }}>Attn: {attentionName}</div>
          ) : null}
          <table style={{ marginTop: '6px', width: '50%' }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: '12px', color: '#555' }}>Emirate</td>
                <td>: {client?.emirate || 'Dubai'}</td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Country</td>
                <td>: UAE</td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>TRN</td>
                <td>: {client?.trn || 'Unregistered'}</td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Place of supply</td>
                <td>: UAE, Dubai</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table width="100%" style={{ borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>Sl No.</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>Description of Services</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>Amount (AED)</th>
            </tr>
          </thead>
          <tbody>
            {serviceOrders.map((serviceOrder, index) => (
              <tr key={`${serviceOrder.description}-${index}`}>
                <td style={{ border: '1px solid #000', padding: '6px 8px', verticalAlign: 'top' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                  <strong>{serviceOrder.description}</strong>
                  {attentionName && index === 0 ? (
                    <div style={{ fontStyle: 'italic', color: '#555', fontSize: '11px' }}>{attentionName}</div>
                  ) : null}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                  {formatAmount(serviceOrder.amount)}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{serviceOrders.length + 1}</td>
              <td style={{ border: '1px solid #000', padding: '6px 8px' }}><strong>Processing Fees</strong></td>
              <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>{formatAmount(invoice.processing_fee)}</td>
            </tr>
          </tbody>
        </table>

        <table width="100%" style={{ marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td width="50%" style={{ verticalAlign: 'top' }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Amount Chargeable (in words)</strong>
                </div>
                <div>UAE Dirham {numberToWords(totalAmount)} Only (AED {formatAmount(totalAmount)})</div>
                <div style={{ marginTop: '10px' }}>
                  <strong>VAT Amount (in words)</strong>
                </div>
                <div>UAE Dirham {numberToWords(vatAmount)} Only (AED {formatAmount(vatAmount)})</div>
              </td>
              <td width="50%">
                <table width="100%" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>Taxable Value</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{formatAmount(invoice.processing_fee)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>Value Added Tax 5%</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{formatAmount(vatAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>NA (Not Applicable)</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{formatAmount(serviceTotal)}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>Invoice Total</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right' }}>{formatAmount(totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {invoice.notes ? (
          <div style={{ marginBottom: '16px' }}>
            <strong>Remarks:</strong> {invoice.notes}
          </div>
        ) : null}

        <table width="100%" style={{ marginTop: '20px' }}>
          <tbody>
            <tr>
              <td width="50%" style={{ verticalAlign: 'top' }}>
                <div style={{ marginBottom: '6px', fontSize: '11px', color: '#555' }}>Declaration</div>
                <div style={{ fontSize: '11px', color: '#555' }}>
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
              </td>
              <td width="50%" style={{ paddingLeft: '20px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Company&apos;s Bank Details</div>
                <table>
                  <tbody>
                    <tr><td style={{ color: '#555', paddingRight: '8px' }}>A/c Holder&apos;s Name</td><td>: AL WAHAA DOCUMENT CLEARING</td></tr>
                    <tr><td style={{ color: '#555' }}>Bank Name</td><td>: RAK Bank</td></tr>
                    <tr><td style={{ color: '#555' }}>A/c No.</td><td>: 0025 331084 061</td></tr>
                    <tr><td style={{ color: '#555' }}>IBAN</td><td>: AE680400000025331084061</td></tr>
                    <tr><td style={{ color: '#555' }}>Branch & SWIFT Code</td><td>: Dubai & NRAKAEAK</td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <table width="100%" style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px' }}>
          <tbody>
            <tr>
              <td width="50%">Customer&apos;s Seal and Signature</td>
              <td width="50%" style={{ textAlign: 'right' }}>
                <div>for AL WAHAA DOCUMENTS CLEARING</div>
                <div style={{ marginTop: '30px', color: '#555', fontSize: '11px' }}>Authorised Signatory</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#555' }}>
          This is a Computer Generated Invoice
        </div>
      </div>
    </>
  )
}
