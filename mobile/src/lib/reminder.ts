import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ID = 'tj-daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Programa (o quita, con null) el recordatorio diario. Devuelve false si el usuario no da permiso. */
export async function setDailyReminder(hour: number | null): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
  if (hour === null) return true;
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title: 'TJ Pro', body: '¿Has apuntado tus operaciones de hoy? Un minuto ahora te ahorra dudas mañana.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
  return true;
}
