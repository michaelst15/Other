 const path = require('path');
 const fs = require('fs');
 const config = require('../config');
 const Product = require('./model');
 const Category = require('../category/model');
 const Tag = require('../tag/model');
                          
 
 const store = async (req, res, next) => {
     try{
         let payload = req.body; 
  
        // relasi product dengan category
         if(payload.category){
             let category = await Category.findOne({name: {$regex: payload.category, $options: 'i'}});
         if(category) {
             payload = {...payload, category: category._id}
           } else {
            delete payload.category;
           }
         } 

         // relasi product dengan tag
         if(payload.tags && payload.tags.length > 0){
            let tags = await Tag.find({name: {$in: payload.tags}});
            console.log(tags)
         if(tags.length) {
            payload = {...payload, tags: tags.map(tag => tag._id)}
          } else {
           delete payload.tags;
          }
        } 


         if(req.file){
            //  console.log(req.file)
             let tmp_path = req.file.path;
             let originalExt = req.file.originalname.split('.')[req.file.originalname.split('.').length - 1];
             let filename = req.file.filename + '.' + originalExt;
             let target_path = path.resolve(config.rootPath, `public/images/product/${filename}`);    

             const src = fs.createReadStream(tmp_path);
             const dest = fs.createWriteStream(target_path);
             src.pipe(dest);

             src.on('end', async () => {
                 try{
                     let product = new Product({...payload, image_url: filename})
                     await product.save()
                     return res.json(product);
                 }
                 catch(err){
                     fs.unlinkSync(target_path);
                     if(err && err.name === 'ValidationError'){
                         return res.json({
                             error: 1,
                             message: err.message,
                             fields: err.errors
                         })
                     }
                     next(err);
                 }
             });
             src.on('error', async () => {
                 next(err);
             });        
         } else {
             let product = new Product(payload);
             await product.save();
             return res.json(product);
         }
     } catch(err) {
         if(err && err.name === 'ValidationError')
             return res.json({
                 error: 1,
                 message: err.message,
                 fields: err.errors
             });
             next(err); 
     }
 } 


 const update = async (req, res, next) => {
    try{
        let payload = req.body; 
        let {id} = req.params;
       
         // relasi product dengan category
        if(payload.category){
            let category = await Category.findOne({name: {$regex: payload.category, $options: 'i'}});
        if(category) {
            payload = {...payload, category: category._id}
          } else {
           delete payload.category;
          }
        } 

         // relasi product dengan tag
        if(payload.tags && payload.tags.length > 0){
            let tags = await Tag.find({name: {$in: payload.tags}});
        if(tags.length) {
            payload = {...payload, tags: tags.map(tag => tag._id)}
          } else {
           delete payload.tags;
          }
        } 

        if(req.file){
            console.log(req.file)
            let tmp_path = req.file.path;
            let originalExt = req.file.originalname.split('.')[req.file.originalname.split('.').length - 1];
            let filename = req.file.filename + '.' + originalExt;
            let target_path = path.resolve(config.rootPath, `public/images/product/${filename}`);    

            const src = fs.createReadStream(tmp_path);
            const dest = fs.createWriteStream(target_path);
            src.pipe(dest);

            src.on('end', async () => {     
                try{
                    let product = await Product.findById(id);
                    let currentImage = `${config.rootPath}/public/images/product/${product.image_url}`;
                    console.log(currentImage);
                    if(fs.existsSync(currentImage)) {
                        fs.unlinkSync(currentImage);
                    }
                    product = await Product.findByIdAndUpdate(id, payload, {
                        new: true, 
                        runValidators: true
                    })    
                    return res.json(product);
                }
                catch(err){
                    fs.unlinkSync(target_path);
                    if(err && err.name === 'ValidationError'){
                        return res.json({
                            error: 1,
                            message: err.message,
                            fields: err.errors
                        })
                    }
                    next(err);
                }
            });
            src.on('error', async () => {
                next(err);
            });        
        } else {
            let product = new Product(payload);
            await product.save();
            return res.json(product);
        }
    } catch(err) {
        if(err && err.name === 'ValidationError')
            return res.json({
                error: 1,
                message: err.message,
                fields: err.errors
            });
            next(err); 

    }
} 


const index = async(req, res, next) => {
     try{
       let {skip = 0, limit = 5, q = '', category = '', tags = []} = req.query;
       let criteria = {};

       if(q.length) {
           criteria = {
               ...criteria, name: {$regex: `${q}`, $options: 'i'}
           }
       }

       if(category.length){
        let categoryResult = await Category.findOne({name: {$regex: `${category}`, $options: 'i'}});

       if(categoryResult) {
            criteria = {...criteria, category: categoryResult._id}
        }
     }
       if(tags.length) {
        let tagsReusult = await Tag.find({name: {$in: tags}});

        if(tagsReusult.length > 0) {
            criteria = {...criteria, tags: {$in: tagsReusult.map(tag => tag._id)}};
        }
     }
       

       let count = await Product.find().countDocuments();
       let product = await Product
       .find(criteria)
       .skip(parseInt(skip))
       .limit(parseInt(limit))
       .populate('category')
       .populate('tags');
       return res.json({
          data: product,
          count
       })
    }
     catch(err){
       next(err)
     }
  
}

const destroy = async(req, res, next) => {
    try{
        let product = await Product.findByIdAndDelete(req.params.id);
        let currentImage = `${config.rootPath}/public/images/product/${product.image_url}`;

        console.log(currentImage);
        if(fs.existsSync(currentImage)) {
            fs.unlinkSync(currentImage);
           }
           return res.json(product);
        }  
    catch(err) {
        next(err)
    }       
}

 module.exports = {
     store,
     index,
     update,
     destroy
 }