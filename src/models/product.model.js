import mongoose from "mongoose"

const ProductSchema = new mongoose.Schema({


  title: {

     type: String,
     required: true 
    
    },
  sku: {
     type: String
     },
  description: { 
    type: String,
     required: true 
    },
  price: { 
    type: Number,
     required: true
     },

  stock: { type: Number, 
    required: true ,
    default : 0 ,
  },
  deliveryTime: { 
    type: String, 
    default: '1 Week' },
  featured: { 
    type: Boolean, 
    default: false
   },
  images: [
    {
      url: String,
      public_id: String
    }
  ],
  collectionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Collection',
    required: true 
  },
 
}, { timestamps: true });


export default mongoose.model("Product", ProductSchema);