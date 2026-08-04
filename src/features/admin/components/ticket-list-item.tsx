/**
 * TicketListItem Component
 * Displays a support ticket in list format with priority and status
 */

import { Pressable, Text, View } from 'react-native';
import { AppButton } from '../../ui/app-button';
import type { SupportTicket } from '../types/admin';

interface TicketListItemProps {
  ticket: SupportTicket;
  onPress?: () => void;
  onStatusChange?: (ticketId: string, status: string) => void;
}

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Rendah' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Sedang' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Tinggi' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Darurat' },
};

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Buka' },
  in_progress: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Proses' },
  resolved: { bg: 'bg-green-50', text: 'text-green-600', label: 'Terselesaikan' },
  closed: { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Ditutup' },
};

export function TicketListItem({
  ticket,
  onPress,
  onStatusChange,
}: TicketListItemProps) {
  const priorityStyle = priorityStyles[ticket.priority] || priorityStyles.low;
  const statusStyle = statusStyles[ticket.status] || statusStyles.open;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-lg p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-slate-900 font-semibold text-base mb-1">
            {ticket.subject}
          </Text>
          <Text className="text-slate-500 text-sm mb-2">
            {ticket.userName} • {ticket.userRole === 'customer' ? 'Pelanggan' : 'Barber'}
          </Text>
        </View>
        <View className={`${priorityStyle.bg} px-3 py-1 rounded-full ml-2`}>
          <Text className={`${priorityStyle.text} text-xs font-semibold`}>
            {priorityStyle.label}
          </Text>
        </View>
      </View>

      <Text className="text-slate-600 text-sm mb-3 line-clamp-2">
        {ticket.description}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className={`${statusStyle.bg} px-3 py-1 rounded-full`}>
          <Text className={`${statusStyle.text} text-xs font-semibold`}>
            {statusStyle.label}
          </Text>
        </View>

        {onStatusChange && ticket.status === 'open' && (
          <AppButton
            title="Mulai"
            size="sm"
            onPress={() => onStatusChange(ticket.ticketId, 'in_progress')}
          />
        )}
      </View>

      {ticket.assignedTo && (
        <Text className="text-slate-400 text-xs mt-2">
          Ditugaskan kepada: {ticket.assignedTo}
        </Text>
      )}
    </Pressable>
  );
}
