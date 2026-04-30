'use client'

import { useCallback, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { INSTALLMENT_OPTIONS } from '@/lib/payments/constants'

export interface CardFormData {
  cardNumber: string
  cardExpirationMonth: string
  cardExpirationYear: string
  customerIdentityNumber: string
  cardPassword?: string
  cardInstallmentPlan: number
}

type IdentityType = 'personal' | 'business'

const cardFormSchema = z.object({
  cardNumber: z
    .string()
    .min(1, '카드번호를 입력해주세요')
    .regex(/^\d{15,16}$/, '카드번호는 15~16자리 숫자입니다'),
  cardExpirationMonth: z
    .string()
    .min(1, '유효기간 월을 입력해주세요')
    .regex(/^(0[1-9]|1[0-2])$/, '01~12 사이의 값을 입력해주세요'),
  cardExpirationYear: z
    .string()
    .min(1, '유효기간 년을 입력해주세요')
    .regex(/^\d{2}$/, '2자리 숫자를 입력해주세요'),
  customerIdentityNumber: z.string().min(1, '인증번호를 입력해주세요'),
  cardPassword: z
    .string()
    .regex(/^(\d{2})?$/, '비밀번호 앞 2자리를 입력해주세요')
    .optional()
    .or(z.literal('')),
  cardInstallmentPlan: z.number(),
})

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  const groups = digits.match(/.{1,4}/g)
  return groups ? groups.join(' ') : digits
}

function stripSpaces(value: string): string {
  return value.replace(/\s/g, '')
}

interface CardInputFormProps {
  onSubmit: (data: CardFormData) => void
  isLoading?: boolean
  submitLabel?: string
}

export default function CardInputForm({
  onSubmit,
  isLoading = false,
  submitLabel = '결제하기',
}: CardInputFormProps) {
  const [identityType, setIdentityType] = useState<IdentityType>('personal')
  const expirationMonthRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof cardFormSchema>>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      cardNumber: '',
      cardExpirationMonth: '',
      cardExpirationYear: '',
      customerIdentityNumber: '',
      cardPassword: '',
      cardInstallmentPlan: 0,
    },
  })

  const handleCardNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
      e.target.value = formatCardNumber(raw)
      // Amex(34/37) 만 15자리, 그 외 (Visa/Mastercard/JCB/국내카드) 는 16자리.
      // 15자리 시점에 점프하면 16자리 카드의 마지막 글자가 다음 필드로 흘러들어감.
      const isAmex = /^3[47]/.test(raw)
      const fullLength = isAmex ? 15 : 16
      setValue('cardNumber', raw, { shouldValidate: raw.length >= fullLength })

      if (raw.length >= fullLength) {
        expirationMonthRef.current?.focus()
      }
    },
    [setValue],
  )

  const handleIdentityTypeChange = useCallback(
    (type: IdentityType) => {
      setIdentityType(type)
      setValue('customerIdentityNumber', '', { shouldValidate: false })
    },
    [setValue],
  )

  const handleFormSubmit = useCallback(
    (data: z.infer<typeof cardFormSchema>) => {
      const formData: CardFormData = {
        cardNumber: stripSpaces(data.cardNumber),
        cardExpirationMonth: data.cardExpirationMonth,
        cardExpirationYear: data.cardExpirationYear,
        customerIdentityNumber: data.customerIdentityNumber,
        cardPassword: data.cardPassword || undefined,
        cardInstallmentPlan: data.cardInstallmentPlan,
      }
      onSubmit(formData)
    },
    [onSubmit],
  )

  const identityValidation =
    identityType === 'personal'
      ? { pattern: /^\d{6}$/, maxLength: 6, placeholder: '생년월일 6자리 (예: 900101)' }
      : { pattern: /^\d{10}$/, maxLength: 10, placeholder: '사업자번호 10자리' }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-5 rounded-lg border border-gray-200 bg-white p-6"
    >
      <div className="space-y-1.5">
        <Label htmlFor="cardNumber">카드번호</Label>
        <Input
          id="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          className="border-gray-200"
          {...register('cardNumber')}
          onChange={handleCardNumberChange}
        />
        {errors.cardNumber && (
          <p className="text-xs text-red-500">{errors.cardNumber.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cardExpirationMonth">유효기간 (월)</Label>
          <Input
            id="cardExpirationMonth"
            inputMode="numeric"
            autoComplete="cc-exp-month"
            placeholder="MM"
            maxLength={2}
            className="border-gray-200"
            {...register('cardExpirationMonth', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2)
              },
            })}
            ref={(el) => {
              register('cardExpirationMonth').ref(el)
              expirationMonthRef.current = el
            }}
          />
          {errors.cardExpirationMonth && (
            <p className="text-xs text-red-500">
              {errors.cardExpirationMonth.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cardExpirationYear">유효기간 (년)</Label>
          <Input
            id="cardExpirationYear"
            inputMode="numeric"
            autoComplete="cc-exp-year"
            placeholder="YY"
            maxLength={2}
            className="border-gray-200"
            {...register('cardExpirationYear', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2)
              },
            })}
          />
          {errors.cardExpirationYear && (
            <p className="text-xs text-red-500">
              {errors.cardExpirationYear.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>인증번호</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleIdentityTypeChange('personal')}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              identityType === 'personal'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full border-2 ${
                identityType === 'personal'
                  ? 'border-blue-500 bg-blue-500 shadow-[inset_0_0_0_2px_white]'
                  : 'border-gray-300 bg-white'
              }`}
            />
            개인 (생년월일 6자리)
          </button>
          <button
            type="button"
            onClick={() => handleIdentityTypeChange('business')}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              identityType === 'business'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full border-2 ${
                identityType === 'business'
                  ? 'border-blue-500 bg-blue-500 shadow-[inset_0_0_0_2px_white]'
                  : 'border-gray-300 bg-white'
              }`}
            />
            법인 (사업자번호 10자리)
          </button>
        </div>
        <Input
          id="customerIdentityNumber"
          inputMode="numeric"
          placeholder={identityValidation.placeholder}
          maxLength={identityValidation.maxLength}
          className="border-gray-200"
          {...register('customerIdentityNumber', {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              e.target.value = e.target.value
                .replace(/\D/g, '')
                .slice(0, identityValidation.maxLength)
            },
          })}
        />
        {errors.customerIdentityNumber && (
          <p className="text-xs text-red-500">
            {errors.customerIdentityNumber.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cardPassword">카드 비밀번호 앞 2자리 (선택)</Label>
        <Input
          id="cardPassword"
          type="password"
          inputMode="numeric"
          placeholder="**"
          maxLength={2}
          className="w-24 border-gray-200"
          {...register('cardPassword', {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2)
            },
          })}
        />
        {errors.cardPassword && (
          <p className="text-xs text-red-500">{errors.cardPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>할부 개월</Label>
        <Controller
          control={control}
          name="cardInstallmentPlan"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(v) => field.onChange(Number(v))}
            >
              <SelectTrigger className="w-full border-gray-200">
                <SelectValue placeholder="할부 선택" />
              </SelectTrigger>
              <SelectContent>
                {INSTALLMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.cardInstallmentPlan && (
          <p className="text-xs text-red-500">
            {errors.cardInstallmentPlan.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? '처리 중...' : submitLabel}
      </Button>
    </form>
  )
}
