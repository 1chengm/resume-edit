import { NextResponse, NextRequest } from 'next/server'
import { authenticateRequest } from '@/src/lib/api-auth'
import { createAuthenticatedClient } from '@/src/lib/api-client'

export async function POST(req: NextRequest) {
  // 设置适当的响应头
  const headers = new Headers({
    'Content-Type': 'application/json'
  })

  try {
    const { user, error: authError } = await authenticateRequest(req)
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, {
        status: 401,
        headers
      })
    }

    const supabase = createAuthenticatedClient(req)

    const form = await req.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: 'Invalid form data' }, {
        status: 400,
        headers
      })
    }

    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, {
        status: 400,
        headers
      })
    }

    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PNG and JPG are allowed' }, {
        status: 400,
        headers
      })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB' }, {
        status: 400,
        headers
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)
    const fileExtension = file.type.includes('png') ? 'png' : 'jpg'
    const path = `${user.id}/avatar.${fileExtension}`

    console.log('Uploading avatar for user:', user.id, 'path:', path, 'size:', file.size, 'type:', file.type)

    // 直接尝试上传文件（跳过存储桶检查，因为权限可能不足）
    const { data: uploadData, error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600'
      })

    if (upErr) {
      console.error('Avatar upload error:', upErr)
      console.error('Upload error details:', {
        message: upErr.message,
        statusCode: upErr.statusCode || 'unknown',
        error: upErr.error
      })
      return NextResponse.json({
        error: `Upload failed: ${upErr.message}`,
        details: upErr.error || 'No additional details'
      }, {
        status: 500,
        headers
      })
    }

    console.log('Upload successful:', uploadData)

    // 获取公共URL
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatar_url = pub?.publicUrl

    if (!avatar_url) {
      return NextResponse.json({ error: 'Failed to get public URL for uploaded file' }, {
        status: 500,
        headers
      })
    }

    console.log('Public URL:', avatar_url)

    // 先尝试更新用户的 profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)

      // 如果记录不存在，尝试插入新记录
      if (updateError.code === 'PGRST116') {
        console.log('Profile not found, creating new one...')
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, avatar_url })

        if (insertError) {
          console.error('Profile insert error:', insertError)
          return NextResponse.json({
            error: `Profile creation failed: ${insertError.message}`,
            details: insertError.error || 'No additional details'
          }, {
            status: 500,
            headers
          })
        }
        console.log('Profile created successfully')
      } else {
        return NextResponse.json({
          error: `Profile update failed: ${updateError.message}`,
          details: updateError.error || 'No additional details'
        }, {
          status: 500,
          headers
        })
      }
    } else {
      console.log('Profile updated successfully')
    }

    return NextResponse.json({
      ok: true,
      avatar_url,
      message: 'Avatar uploaded successfully'
    }, {
      headers
    })

  } catch (err) {
    console.error('Unexpected error in POST /api/profile/avatar:', err)
    return NextResponse.json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, {
      status: 500,
      headers
    })
  }
}