import Big from 'big.js'
import { describe, expect, it } from 'vitest'
import { D, dec, formatInput, formatValue, formatValueFit, formatX, roundTax, toNum } from './number'

describe('D（専用の Big コンストラクタ）', () => {
  it('二進浮動小数の誤差を出さない', () => {
    expect(toNum(dec('0.1').plus('0.2'))).toBe('0.3')
  })

  it('割り算は小数点以下20桁で四捨五入する', () => {
    expect(toNum(dec('10').div('3'))).toBe('3.33333333333333333333')
    expect(toNum(dec('2').div('3'))).toBe('0.66666666666666666667')
  })

  it('グローバルの Big の設定は変えない', () => {
    expect(D.PE).toBe(1e6)
    expect(Big.PE).toBe(21) // big.js の既定値のまま
  })
})

describe('toNum', () => {
  it('大きい数・小さい数も指数表記にしない', () => {
    expect(toNum(dec('1e25'))).toBe('10000000000000000000000000')
    expect(toNum(dec('1e-8'))).toBe('0.00000001')
  })

  it('-0 は 0 にする', () => {
    expect(toNum(dec('-0'))).toBe('0')
    expect(toNum(dec('5').minus('5').times('-1'))).toBe('0')
  })
})

describe('roundTax（税額の端数処理）', () => {
  const cases: [string, string, string, string, string][] = [
    // 値      切り捨て  四捨五入  切り上げ  丸めない
    ['99.9', '99', '100', '100', '99.9'],
    ['99.5', '99', '100', '100', '99.5'],
    ['99.4', '99', '99', '100', '99.4'],
    ['100', '100', '100', '100', '100'],
    ['-99.5', '-99', '-100', '-100', '-99.5'],
    ['-99.4', '-99', '-99', '-100', '-99.4'],
  ]
  it.each(cases)('%s → 切り捨て %s／四捨五入 %s／切り上げ %s／丸めない %s', (v, down, halfUp, up, none) => {
    expect(toNum(roundTax(dec(v), 'down'))).toBe(down)
    expect(toNum(roundTax(dec(v), 'halfUp'))).toBe(halfUp)
    expect(toNum(roundTax(dec(v), 'up'))).toBe(up)
    expect(toNum(roundTax(dec(v), 'none'))).toBe(none)
  })

  it('負の小さな値を切り捨てても -0 にならない', () => {
    expect(toNum(roundTax(dec('-0.4'), 'down'))).toBe('0')
  })
})

describe('formatValue（確定値の表示）', () => {
  it('3桁ごとにカンマで区切る', () => {
    expect(formatValue('0', 10)).toBe('0')
    expect(formatValue('999', 10)).toBe('999')
    expect(formatValue('1000', 10)).toBe('1,000')
    expect(formatValue('1234567.89', 10)).toBe('1,234,567.89')
    expect(formatValue('-1234567', 10)).toBe('-1,234,567')
  })

  it('小数部にはカンマを入れない', () => {
    expect(formatValue('0.123456', 10)).toBe('0.123456')
  })

  it('設定した桁数で四捨五入し、末尾の0を取り除く', () => {
    expect(formatValue(toNum(dec('10').div('3')), 10)).toBe('3.3333333333')
    expect(formatValue(toNum(dec('2').div('3')), 10)).toBe('0.6666666667')
    expect(formatValue('1.50', 10)).toBe('1.5')
    expect(formatValue('2.9999999999999', 10)).toBe('3')
    expect(formatValue('1234.5678', 2)).toBe('1,234.57')
    expect(formatValue('1234.5', 0)).toBe('1,235')
  })

  it('四捨五入で0になる負の数は -0 ではなく 0 と表示する', () => {
    expect(formatValue('-0.00000000001', 10)).toBe('0')
  })

  it('整数部が21桁までは普通の表記', () => {
    expect(formatValue('999999999999999999999', 10)).toBe('999,999,999,999,999,999,999')
  })

  it('整数部が21桁を超えると指数表記にする', () => {
    expect(formatValue('1230000000000000000000', 10)).toBe('1.23e+21')
    expect(formatValue('-1e21', 10)).toBe('-1e+21')
    expect(formatValue('12345678901234567890123', 3)).toBe('1.235e+22')
  })
})

describe('formatInput（入力中の表示）', () => {
  it('3桁ごとにカンマで区切る', () => {
    expect(formatInput('1234')).toBe('1,234')
    expect(formatInput('-1234567')).toBe('-1,234,567')
  })

  it('末尾の "." や "0" はそのまま残す', () => {
    expect(formatInput('1234.50')).toBe('1,234.50')
    expect(formatInput('1234.')).toBe('1,234.')
    expect(formatInput('0.')).toBe('0.')
    expect(formatInput('-0.0')).toBe('-0.0')
  })

  it('小数部にはカンマを入れない', () => {
    expect(formatInput('0.12345')).toBe('0.12345')
  })
})

describe('formatX（スタック0の表示）', () => {
  it('空は無表示、負号だけなら -', () => {
    expect(formatX({ kind: 'empty', negative: false }, 10)).toBe('')
    expect(formatX({ kind: 'empty', negative: true }, 10)).toBe('-')
  })

  it('入力中と確定値', () => {
    expect(formatX({ kind: 'input', text: '1234.50' }, 10)).toBe('1,234.50')
    expect(formatX({ kind: 'value', value: '1234.50' }, 10)).toBe('1,234.5')
  })

  it('確定値は幅に合わせて小数の桁を減らすが、入力中はそのまま', () => {
    expect(formatX({ kind: 'value', value: '1234.5678' }, 10, 7)).toBe('1,234.6')
    expect(formatX({ kind: 'input', text: '1234.5678' }, 10, 7)).toBe('1,234.5678')
  })
})

describe('formatValueFit（幅に合わせて小数の桁を減らす）', () => {
  const third = toNum(dec('100').div('3')) // 33.333…

  it('収まるときは設定の桁数のまま', () => {
    expect(formatValueFit(third, 10, 20)).toBe('33.3333333333')
    expect(formatValueFit(third, 10)).toBe('33.3333333333')
  })

  it('収まるまで小数の桁を減らす（四捨五入）', () => {
    expect(formatValueFit(third, 10, 9)).toBe('33.333333')
    expect(formatValueFit(third, 10, 4)).toBe('33.3')
    expect(formatValueFit('2.96', 10, 3)).toBe('3') // 2.96 → 小数1桁は '3.0' → 末尾の0を取り除いて '3'
  })

  it('整数部が見えるよう、最後は小数0桁にする', () => {
    expect(formatValueFit(third, 10, 3)).toBe('33')
    expect(formatValueFit('1234567.89', 10, 5)).toBe('1,234,568') // 収まらなくても整数部は残す（左側の省略は CSS）
  })

  it('カンマと負号も文字数に数える', () => {
    expect(formatValueFit('-1234.56', 10, 8)).toBe('-1,234.6')
  })

  it('指数表記は仮数部の桁を減らす', () => {
    expect(formatValueFit('12345678901234567890123', 10, 9)).toBe('1.235e+22')
  })
})
