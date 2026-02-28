import mongoose, { Schema } from "mongoose";

const vitalSchema = new Schema(
    {
        encounter_id: { type: Schema.Types.ObjectId, ref: 'Encounter', required: true },
        heart_rate: Number,
        blood_pressure: String,
        temperature: Number,
        oxygen_saturation: Number,
    },
    { timestamps: true }
);

export const Vital = mongoose.model("Vital", vitalSchema);