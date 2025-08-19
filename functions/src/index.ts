import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

// ✅ 1. Trigger real-time dari Firestore
export const notifySensorThreshold = onDocumentCreated(
  "Terrarium/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No snapshot data");
      return;
    }

    const data = snapshot.data();
    const sensorArray = data?.SensorValue;
    if (!Array.isArray(sensorArray) || sensorArray.length === 0) {
      logger.warn("SensorValue kosong atau bukan array");
      return;
    }

    const sensor = sensorArray[0];
    const suhu = sensor.Temperature || 0;
    const kelembapanTanah = sensor.Humidity || 0;
    const distance = sensor.WaterLevel || 0;

    let alertMessages: string[] = [];

    // 🔹 Cek ambang batas sensor
    if (suhu > 26) {
      alertMessages.push(`Suhu tinggi: ${suhu}°C`);
    } else if (suhu < 20) {
      alertMessages.push(`Suhu terlalu rendah: ${suhu}°C`);
    }

    if (kelembapanTanah > 150) {
      alertMessages.push(`Kelembapan tinggi: ${kelembapanTanah}`);
    } else if (kelembapanTanah < 50) {
      alertMessages.push(`Kelembapan rendah: ${kelembapanTanah}`);
    }

    if (distance <= 0) {
      alertMessages.push(`Tangki Air Kosong!`);
    } else if (distance < 5) {
      alertMessages.push(`Air terlalu rendah: ${distance} cm`);
    } else if (distance >= 14) {
      alertMessages.push(`Air terlalu tinggi: ${distance} cm`);
    }

    // 🔹 Kirim notifikasi jika ada alert sensor
    if (alertMessages.length > 0) {
      const payload = {
        notification: {
          title: "⚠️ Peringatan Terrarium",
          body: alertMessages.join(" | "),
        },
        topic: "alert",
      };

      try {
        const response = await admin.messaging().send(payload);
        logger.info("✅ Notifikasi sensor terkirim:", response);
      } catch (error) {
        logger.error("❌ Gagal kirim notifikasi sensor:", error);
      }
    } else {
      logger.info("Tidak ada notifikasi sensor untuk dikirim.");
    }
  }
);

export const notifyFeedingSchedule = onSchedule(
  {
    schedule: "45 21 * * 0,2,4", // 0=Min, 2=Sel, 4=Kam
    timeZone: "Asia/Jakarta",
  },
  async () => {
    const payload = {
      notification: {
        title: "📅 Jadwal Pemberian Makan",
        body: "Hari ini jadwal Pemberian makan terrarium!",
      },
      topic: "alert",
    };

    try {
      const response = await admin.messaging().send(payload);
      logger.info("✅ Notifikasi jadwal makan terkirim:", response);
    } catch (error) {
      logger.error("❌ Gagal kirim notifikasi jadwal makan:", error);
    }
  }
);

export const notifyCleanningSchedule = onSchedule(
  {
    schedule: "30 19 * * 0,2,4", // 0=Min, 2=Sel, 4=Kam
    timeZone: "Asia/Jakarta",
  },
  async () => {
    const payload = {
      notification: {
        title: "📅 Jadwal Pembersihan Terrarium",
        body: "Hari ini jadwal pembersihan terrarium!",
      },
      topic: "alert",
    };

    try {
      const response = await admin.messaging().send(payload);
      logger.info("✅ Notifikasi jadwal pembersihan terkirim:", response);
    } catch (error) {
      logger.error("❌ Gagal kirim notifikasi jadwal makan:", error);
    }
  }
);
