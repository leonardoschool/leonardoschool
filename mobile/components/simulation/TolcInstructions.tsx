/**
 * Leonardo School Mobile - TOLC Instructions
 * 
 * Pagina istruzioni completa per simulazioni TOLC-style.
 * Mostra tutte le regole e informazioni prima di entrare nella waiting room.
 */

import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, Button, Card } from '../ui';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';

// ==================== TYPES ====================

interface TolcInstructionsProps {
  simulationTitle: string;
  durationMinutes: number;
  totalQuestions: number;
  sectionsCount: number;
  onContinue: () => void;
  isLoading?: boolean;
}

// ==================== CHECKBOX COMPONENT ====================

interface CustomCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description: string;
}

function CustomCheckbox({ checked, onToggle, label, description }: CustomCheckboxProps) {
  const { themed } = useTheme();

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing[3],
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? colors.primary.main : themed(colors.border.primary),
          backgroundColor: checked ? colors.primary.main : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {label}
        </Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ==================== STAT CARD ====================

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  iconColor: string;
}

function StatCard({ icon, value, label, iconColor }: StatCardProps) {
  const { themed } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        padding: spacing[4],
        borderRadius: 12,
        backgroundColor: themed(colors.background.secondary),
        alignItems: 'center',
      }}
    >
      <Ionicons name={icon} size={24} color={iconColor} />
      <Text variant="h4" style={{ marginTop: spacing[2] }}>
        {value}
      </Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

// ==================== INFO ROW ====================

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

function InfoRow({ icon, iconColor, title, description }: InfoRowProps) {
  const { themed } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing[3],
        padding: spacing[3],
        borderRadius: 12,
        backgroundColor: themed(colors.background.secondary),
      }}
    >
      <Ionicons name={icon} size={20} color={iconColor} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text variant="body" style={{ fontWeight: '500' }}>
          {title}
        </Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}

// ==================== MAIN COMPONENT ====================

export default function TolcInstructions({
  durationMinutes,
  totalQuestions,
  sectionsCount,
  onContinue,
  isLoading = false,
}: TolcInstructionsProps) {
  const { themed } = useTheme();
  const [hasReadAll, setHasReadAll] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const canContinue = hasReadAll && acceptedRules;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themed(colors.background.primary) }}
      contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[8] }}
    >
      {/* Intro Card */}
      <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: colors.status.info.light,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="information-circle" size={24} color={colors.status.info.main} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h5" style={{ marginBottom: spacing[1] }}>
              Benvenuto nella Simulazione Ufficiale
            </Text>
            <Text variant="bodySmall" color="secondary">
              Stai per iniziare una simulazione che replica fedelmente il test ufficiale TOLC. 
              Leggi attentamente tutte le istruzioni prima di procedere.
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <StatCard icon="time-outline" value={durationMinutes} label="minuti totali" iconColor={themed(colors.text.muted)} />
          <StatCard icon="help-circle-outline" value={totalQuestions} label="domande" iconColor={themed(colors.text.muted)} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
          <StatCard icon="layers-outline" value={sectionsCount} label="sezioni" iconColor={themed(colors.text.muted)} />
          <StatCard icon="shield-checkmark-outline" value="Sì" label="anti-cheat" iconColor={themed(colors.text.muted)} />
        </View>
      </Card>

      {/* Sections Info */}
      <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#f3e8ff',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="layers" size={20} color="#9333ea" />
          </View>
          <Text variant="h5">Struttura a Sezioni</Text>
        </View>

        {/* Warning */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing[3],
            padding: spacing[4],
            borderRadius: 12,
            backgroundColor: colors.status.warning.light,
            marginBottom: spacing[4],
          }}
        >
          <Ionicons name="warning" size={20} color={colors.status.warning.main} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '600', color: colors.status.warning.main }}>
              Importante: Sezioni non reversibili
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: spacing[1] }}>
              Una volta conclusa una sezione, non potrai tornare indietro. Assicurati di aver risposto a tutte le domande.
            </Text>
          </View>
        </View>

        {/* Rules */}
        <View style={{ gap: spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] }}>
            <Ionicons name="checkmark-circle" size={20} color={colors.status.success.main} style={{ marginTop: 2 }} />
            <Text variant="bodySmall" color="secondary" style={{ flex: 1 }}>
              Ogni sezione ha un tempo dedicato che non può essere trasferito ad altre sezioni
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] }}>
            <Ionicons name="checkmark-circle" size={20} color={colors.status.success.main} style={{ marginTop: 2 }} />
            <Text variant="bodySmall" color="secondary" style={{ flex: 1 }}>
              All&apos;interno di una sezione puoi navigare liberamente tra le domande
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] }}>
            <Ionicons name="checkmark-circle" size={20} color={colors.status.success.main} style={{ marginTop: 2 }} />
            <Text variant="bodySmall" color="secondary" style={{ flex: 1 }}>
              Puoi segnalare domande con la bandierina per rivederle
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] }}>
            <Ionicons name="lock-closed" size={20} color={colors.status.warning.main} style={{ marginTop: 2 }} />
            <Text variant="bodySmall" color="secondary" style={{ flex: 1 }}>
              Il tempo non utilizzato in una sezione verrà perso
            </Text>
          </View>
        </View>
      </Card>

      {/* Scoring */}
      <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: colors.status.success.light,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="trophy" size={20} color={colors.status.success.main} />
          </View>
          <Text variant="h5">Sistema di Punteggio</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {/* Correct */}
          <View
            style={{
              flex: 1,
              padding: spacing[4],
              borderRadius: 12,
              backgroundColor: colors.status.success.light,
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={28} color={colors.status.success.main} />
            <Text variant="h4" style={{ color: colors.status.success.main, marginTop: spacing[2] }}>
              +1.5
            </Text>
            <Text variant="caption" style={{ color: colors.status.success.main }}>
              Corretta
            </Text>
          </View>

          {/* Wrong */}
          <View
            style={{
              flex: 1,
              padding: spacing[4],
              borderRadius: 12,
              backgroundColor: colors.status.error.light,
              alignItems: 'center',
            }}
          >
            <Ionicons name="close-circle" size={28} color={colors.status.error.main} />
            <Text variant="h4" style={{ color: colors.status.error.main, marginTop: spacing[2] }}>
              -0.4
            </Text>
            <Text variant="caption" style={{ color: colors.status.error.main }}>
              Errata
            </Text>
          </View>

          {/* Not answered */}
          <View
            style={{
              flex: 1,
              padding: spacing[4],
              borderRadius: 12,
              backgroundColor: themed(colors.background.secondary),
              alignItems: 'center',
            }}
          >
            <Ionicons name="remove-circle" size={28} color={themed(colors.text.muted)} />
            <Text variant="h4" color="muted" style={{ marginTop: spacing[2] }}>
              0
            </Text>
            <Text variant="caption" color="muted">
              Non data
            </Text>
          </View>
        </View>
      </Card>

      {/* Anti-cheat */}
      <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: colors.status.error.light,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="shield" size={20} color={colors.status.error.main} />
          </View>
          <Text variant="h5">Sistema Anti-Cheat</Text>
        </View>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: spacing[4] }}>
          Per garantire l&apos;integrità del test, sono attive le seguenti misure di sicurezza:
        </Text>

        <View style={{ gap: spacing[3] }}>
          <InfoRow
            icon="eye-outline"
            iconColor={colors.primary.main}
            title="Monitoraggio App"
            description="L'uscita dall'app viene registrata"
          />
          <InfoRow
            icon="phone-portrait-outline"
            iconColor={colors.primary.main}
            title="Modalità Immersiva"
            description="Il test richiede l'attenzione completa"
          />
          <InfoRow
            icon="warning-outline"
            iconColor={colors.primary.main}
            title="Registrazione Eventi"
            description="Tutti i comportamenti sospetti vengono registrati"
          />
        </View>

        {/* Warning box */}
        <View
          style={{
            marginTop: spacing[4],
            padding: spacing[4],
            borderRadius: 12,
            backgroundColor: colors.status.error.light,
          }}
        >
          <Text variant="bodySmall" style={{ color: colors.status.error.main }}>
            <Text style={{ fontWeight: '700' }}>Attenzione:</Text> Comportamenti sospetti potrebbero invalidare il tuo tentativo e saranno visibili al docente nel report finale.
          </Text>
        </View>
      </Card>

      {/* General Rules */}
      <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: colors.status.info.light,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="book" size={20} color={colors.status.info.main} />
          </View>
          <Text variant="h5">Regole Generali</Text>
        </View>

        <View style={{ gap: spacing[3] }}>
          {[
            "Il timer partirà contemporaneamente per tutti i partecipanti",
            "Non chiudere l'app durante il test",
            "Non è consentito l'uso di materiale di supporto esterno",
            "Una volta inviata la simulazione, non sarà possibile ripeterla",
            "Assicurati di avere una connessione internet stabile",
          ].map((rule, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.status.info.light,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text variant="caption" style={{ color: colors.status.info.main, fontWeight: '700' }}>
                  {index + 1}
                </Text>
              </View>
              <Text variant="bodySmall" color="secondary" style={{ flex: 1 }}>
                {rule}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Confirmation */}
      <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
        <View style={{ gap: spacing[4] }}>
          {/* Checkbox 1 */}
          <View
            style={{
              padding: spacing[4],
              borderRadius: 12,
              backgroundColor: hasReadAll ? colors.status.success.light : themed(colors.background.secondary),
              borderWidth: hasReadAll ? 1 : 0,
              borderColor: colors.status.success.main,
            }}
          >
            <CustomCheckbox
              checked={hasReadAll}
              onToggle={() => setHasReadAll(!hasReadAll)}
              label="Ho letto e compreso tutte le istruzioni"
              description="Confermo di aver letto attentamente tutte le regole del test"
            />
          </View>

          {/* Checkbox 2 */}
          <View
            style={{
              padding: spacing[4],
              borderRadius: 12,
              backgroundColor: acceptedRules ? colors.status.success.light : themed(colors.background.secondary),
              borderWidth: acceptedRules ? 1 : 0,
              borderColor: colors.status.success.main,
            }}
          >
            <CustomCheckbox
              checked={acceptedRules}
              onToggle={() => setAcceptedRules(!acceptedRules)}
              label="Accetto le regole e le misure anti-cheat"
              description="Sono consapevole che comportamenti scorretti verranno registrati"
            />
          </View>
        </View>
      </Card>

      {/* Continue Button */}
      <Button
        onPress={onContinue}
        disabled={!canContinue || isLoading}
        loading={isLoading}
        style={{ marginBottom: spacing[4] }}
        rightIcon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
      >
        Continua alla Waiting Room
      </Button>

      {!canContinue && (
        <Text variant="caption" color="muted" align="center">
          Devi accettare entrambe le condizioni per continuare
        </Text>
      )}
    </ScrollView>
  );
}
