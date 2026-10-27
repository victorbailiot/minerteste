'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { FileText, Send, CheckCircle, AlertCircle } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { quotationSchema, QuotationInput } from '@/lib/schemas/quotation.schema';
import Image from 'next/image';

const QuotationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuotationInput>({
    resolver: zodResolver(quotationSchema),
  });

  const onSubmit = async (data: QuotationInput) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao enviar cotação');
      }

      setSubmitStatus('success');
      reset();

      // Reset success message após 5 segundos
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Erro ao enviar cotação'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const mineralTypes = [
    { value: 'cobre', label: 'Cobre' },
    { value: 'ferro', label: 'Ferro' },
    { value: 'ouro', label: 'Ouro' },
    { value: 'aluminio', label: 'Alumínio' },
    { value: 'outro', label: 'Outro' },
  ];

  const qualityOptions = [
    { value: '99.9%', label: '99.9% (Alta Pureza)' },
    { value: '99.5%', label: '99.5% (Pureza Padrão)' },
    { value: '99.0%', label: '99.0% (Pureza Comercial)' },
    { value: '95-98%', label: '95-98% (Pureza Industrial)' },
  ];

  const deadlineOptions = [
    { value: 'urgente', label: 'Urgente (até 7 dias)' },
    { value: '15-dias', label: '15 dias' },
    { value: '30-dias', label: '30 dias' },
    { value: '60-dias', label: '60 dias' },
    { value: '90-dias', label: '90+ dias' },
  ];

  return (
    <section id="cotacao" className="py-20 bg-gradient-to-br from-copper-dark via-copper-primary to-gold-accent">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <AnimatedSection direction="left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium mb-4">
              <FileText className="w-4 h-4" />
              <span>Cotação de Minérios</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Solicite sua Cotação
            </h2>

            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Fornecemos minérios de alta qualidade para sua indústria. Preencha
              o formulário e receba uma cotação personalizada em até 24 horas.
            </p>

            {/* Image */}
            <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl hidden lg:block">
              <Image
                src="https://images.unsplash.com/photo-1611348524140-53c9a25263d6?auto=format&fit=crop&q=80"
                alt="Minérios"
                fill
                className="object-cover"
              />
            </div>
          </AnimatedSection>

          {/* Right - Form */}
          <AnimatedSection direction="right">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Mineral Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Minério *
                  </label>
                  <select
                    {...register('mineralType')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                  >
                    <option value="">Selecione...</option>
                    {mineralTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.mineralType && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.mineralType.message}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantidade (toneladas) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                    placeholder="Ex: 100"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>

                {/* Quality */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pureza/Qualidade *
                  </label>
                  <select
                    {...register('quality')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                  >
                    <option value="">Selecione...</option>
                    {qualityOptions.map((quality) => (
                      <option key={quality.value} value={quality.value}>
                        {quality.label}
                      </option>
                    ))}
                  </select>
                  {errors.quality && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.quality.message}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Local de Entrega *
                  </label>
                  <input
                    type="text"
                    {...register('location')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                    placeholder="Cidade, Estado ou CEP"
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.location.message}
                    </p>
                  )}
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prazo de Entrega *
                  </label>
                  <select
                    {...register('deadline')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                  >
                    <option value="">Selecione...</option>
                    {deadlineOptions.map((deadline) => (
                      <option key={deadline.value} value={deadline.value}>
                        {deadline.label}
                      </option>
                    ))}
                  </select>
                  {errors.deadline && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.deadline.message}
                    </p>
                  )}
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    {...register('companyName')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                    placeholder="Sua Empresa Ltda"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                    placeholder="contato@empresa.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                    placeholder="(11) 98765-4321"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Observações Adicionais
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all resize-none"
                    placeholder="Informações adicionais sobre sua necessidade..."
                  />
                </div>

                {/* Success/Error Messages */}
                {submitStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Cotação enviada com sucesso! Entraremos em contato em breve.</span>
                  </motion.div>
                )}

                {submitStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full px-8 py-4 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold text-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Solicitar Cotação</span>
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default QuotationForm;
