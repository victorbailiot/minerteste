import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, isValidRealEmail, isValidCPF, serializeBigInt, generateUniqueReferralCode, normalizeEmail, validateEmailWithDetails } from '@/lib/utils'
import { EmailService } from '@/lib/email-service'
import crypto from 'crypto'
import { createOrUpdateUnilevelUser } from '@/lib/business-logic-unilevel'
import { getUserActivePackage } from '@/lib/business-utils'
import { DocumentType } from '@/generated/prisma'
import { validateDocument, validatePhone, validatePostalCode } from '@/lib/international-utils'
import { clearRegisterPhoneVerification, ensureRegisterPhoneVerified, isPhoneAlreadyRegistered, PhoneVerificationError } from '@/lib/phone-verification'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      email, 
      password, 
      sponsorId,
      // Campos antigos (compatibilidade)
      phone: legacyPhone,
      cpf: legacyCpf,
      // Campos novos (internacionais)
      country,
      documentType,
      documentNumber,
      phoneCountryCode,
      phoneNumber,
      address
    } = body

    // Validação dos campos obrigatórios
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Determinar se está usando formato antigo ou novo
    const isLegacyFormat = legacyCpf && legacyPhone && !country
    
    // Validações condicionais baseadas no formato
    let finalCountry: string
    let finalDocumentType: DocumentType
    let finalDocumentNumber: string
    let finalPhoneCountryCode: string
    let finalPhoneNumber: string
    let finalPhone: string // Para compatibilidade

    if (isLegacyFormat) {
      // Formato antigo (brasileiro)
      finalCountry = 'BR'
      finalDocumentType = DocumentType.CPF
      finalDocumentNumber = legacyCpf
      finalPhoneCountryCode = '+55'
      // Remove formatação do telefone
      finalPhoneNumber = legacyPhone.replace(/\D/g, '')
      finalPhone = legacyPhone
      
      // Validar CPF
      if (!isValidCPF(legacyCpf)) {
        return NextResponse.json(
          { error: 'CPF inválido' },
          { status: 400 }
        )
      }
    } else {
      // Formato novo (internacional)
      if (!country || !documentType || !documentNumber || !phoneCountryCode || !phoneNumber) {
        return NextResponse.json(
          { error: 'País, tipo de documento, número do documento, código do país e telefone são obrigatórios' },
          { status: 400 }
        )
      }

      finalCountry = country
      finalDocumentType = documentType as DocumentType
      finalDocumentNumber = documentNumber
      finalPhoneCountryCode = phoneCountryCode
      finalPhoneNumber = phoneNumber
      // Manter telefone formatado para compatibilidade
      finalPhone = `${phoneCountryCode} ${phoneNumber}`

      // Validar documento
      if (!validateDocument(finalDocumentType, finalDocumentNumber, finalCountry)) {
        return NextResponse.json(
          { error: 'Documento inválido para o tipo e país selecionados' },
          { status: 400 }
        )
      }

      // Validar telefone
      if (!validatePhone(finalPhoneNumber, finalPhoneCountryCode, finalCountry)) {
        return NextResponse.json(
          { error: 'Telefone inválido para o país selecionado' },
          { status: 400 }
        )
      }
    }

    const existingPhone = await isPhoneAlreadyRegistered(finalPhoneCountryCode, finalPhoneNumber)

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Este telefone já está cadastrado' },
        { status: 409 }
      )
    }

    // Normalizar email (converter para minúsculas e remover espaços)
    const normalizedEmail = normalizeEmail(email)
    const emailValidation = validateEmailWithDetails(normalizedEmail)

    // Validação básica e inteligente do email
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error || 'Email inválido' },
        { status: 400 }
      )
    }

    // Validação de email real
    const isRealEmail = await isValidRealEmail(normalizedEmail)
    if (!isRealEmail) {
      return NextResponse.json(
        { error: 'Por favor, use um email válido e real. Emails temporários não são aceitos.' },
        { status: 400 }
      )
    }

    // Validação da senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Validar endereço se fornecido
    if (address) {
      const { street, number, neighborhood, city, state, postalCode, country: addressCountry } = address
      
      if (!street || !number || !neighborhood || !city || !state || !postalCode || !addressCountry) {
        return NextResponse.json(
          { error: 'Todos os campos do endereço são obrigatórios' },
          { status: 400 }
        )
      }

      // Validar código postal
      if (!validatePostalCode(postalCode, addressCountry)) {
        return NextResponse.json(
          { error: 'Código postal inválido para o país selecionado' },
          { status: 400 }
        )
      }
    }

    // Verificar se o email já está em uso
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 409 }
      )
    }

    // Verificar se o documento já está em uso
    const existingDocument = await prisma.user.findFirst({
      where: {
        documentNumber: finalDocumentNumber,
        documentType: finalDocumentType,
      }
    })

    if (existingDocument) {
      return NextResponse.json(
        { error: 'Este documento já está cadastrado' },
        { status: 409 }
      )
    }

    // Buscar patrocinador se código foi fornecido
    let sponsorIdBigInt: bigint | null = null
    
    if (sponsorId) {
      // Buscar patrocinador por código de indicação
      const sponsor = await prisma.user.findUnique({
        where: { referralCode: sponsorId }
      })
      
      if (!sponsor) {
        return NextResponse.json(
          { error: 'Código de indicação inválido' },
          { status: 400 }
        )
      }

      // Verificar se o patrocinador tem pacote ativo (não expirado)
      const sponsorActivePackage = await getUserActivePackage(sponsor.id)

      if (!sponsorActivePackage) {
        return NextResponse.json(
          { error: 'Não é possível se cadastrar com este patrocinador.' },
          { status: 400 }
        )
      }

      sponsorIdBigInt = sponsor.id
      
      console.log(`🎯 Patrocinador validado:`)
      console.log(`   Patrocinador: ${sponsor.name} (${Number(sponsor.id)})`)
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password)

    // Gerar código de indicação único
    const referralCode = await generateUniqueReferralCode(prisma)

    // Gerar token de confirmação de email
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    // Criar usuário com campos internacionais
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        referralCode,
        sponsorId: sponsorIdBigInt,
        emailVerificationToken,
        emailVerificationExpires,
        // Campos internacionais
        country: finalCountry,
        documentType: finalDocumentType,
        documentNumber: finalDocumentNumber,
        phoneCountryCode: finalPhoneCountryCode,
        phoneNumber: finalPhoneNumber,
        // Campos legados para compatibilidade
        phone: finalPhone,
        cpf: isLegacyFormat ? legacyCpf : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        country: true,
        documentType: true,
        documentNumber: true,
        phoneCountryCode: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        sponsorId: true,
        createdAt: true
      }
    })

    // Criar endereço se fornecido
    if (address) {
      await prisma.address.create({
        data: {
          userId: newUser.id,
          street: address.street,
          number: address.number,
          complement: address.complement || '',
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          isDefault: true, // Primeiro endereço é sempre padrão
          isActive: true,
        }
      })
    }

    await createOrUpdateUnilevelUser(newUser.id, newUser.sponsorId ? BigInt(newUser.sponsorId) : undefined)

    // Enviar email de confirmação
    try {
      await EmailService.sendConfirmationEmail({
        userName: newUser.name,
        userEmail: newUser.email,
        confirmationToken: emailVerificationToken,
      })
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError)
      // Não falhar o registro se o email falhar
    }

    await clearRegisterPhoneVerification(finalPhoneCountryCode, finalPhoneNumber)

    // Retornar dados do usuário (senha já foi excluída no select)
    return NextResponse.json({
      success: true,
      message: 'Usuário cadastrado com sucesso! Verifique seu email para confirmar sua conta.',
      user: serializeBigInt({
        ...newUser,
        packages: [] // Novo usuário não tem pacotes ainda
      }),
      referralCode // Retornar o código de indicação gerado
    })

  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 